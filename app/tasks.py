import html
import logging
from email.mime.image import MIMEImage

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone

from .models import OnboardingProfile
from .utils.certificate_renderer import (
    build_certificate_context,
    render_certificate_pdf,
    render_certificate_png,
)

logger = logging.getLogger(__name__)


def _safe_email_error_summary(exc):
    detail = str(exc).strip()
    if detail:
        return f"{exc.__class__.__name__}: {detail}"
    return exc.__class__.__name__


def _normalize_backend_values(values):
    normalized = set()
    for value in values or ():
        backend_name = str(value or "").strip()
        if backend_name:
            normalized.add(backend_name)
    return normalized


def _assert_email_transport_ready():
    backend_name = (getattr(settings, "EMAIL_BACKEND", "") or "").strip()
    config_error = (getattr(settings, "EMAIL_CONFIGURATION_ERROR", "") or "").strip()
    non_delivery_backends = _normalize_backend_values(
        getattr(
            settings,
            "EMAIL_NON_DELIVERY_BACKENDS",
            (
                "django.core.mail.backends.console.EmailBackend",
                "django.core.mail.backends.dummy.EmailBackend",
                "django.core.mail.backends.filebased.EmailBackend",
            ),
        )
    )

    if config_error:
        raise RuntimeError(config_error)

    if backend_name in non_delivery_backends:
        raise RuntimeError(
            f"Outbound email transport is not configured for real delivery (EMAIL_BACKEND={backend_name})."
        )

    return backend_name


def _resolve_completion_email_recipient(profile, claimed_user_id, claimed_user_email):
    """Resolve recipient from the user tied to the onboarding profile.

    Falls back to claimed_user_id / claimed_user_email only when profile linkage is unavailable.
    """
    profile_user_id = getattr(profile, "user_id", None)
    resolved_user_id = profile_user_id or claimed_user_id

    if profile_user_id and claimed_user_id:
        try:
            profile_user_id_int = int(profile_user_id)
            claimed_user_id_int = int(claimed_user_id)
        except (TypeError, ValueError):
            profile_user_id_int = profile_user_id
            claimed_user_id_int = claimed_user_id

        if profile_user_id_int != claimed_user_id_int:
            logger.warning(
                "onboarding_email user_id mismatch profile_user_id=%s claimed_user_id=%s",
                profile_user_id,
                claimed_user_id,
            )

    resolved_email = ""
    if resolved_user_id:
        User = get_user_model()
        db_email = User.objects.filter(pk=resolved_user_id).values_list("email", flat=True).first()
        resolved_email = (db_email or "").strip()

    # If the onboarding profile is linked to a user, trust only that user's current DB email.
    # This guarantees delivery targets the logged-in account owner tied to the profile.
    if not resolved_email and not profile_user_id:
        resolved_email = (claimed_user_email or "").strip()

    return resolved_user_id, resolved_email


def send_onboarding_completion_email_task(profile_id, user_id, user_email, display_name, request_id):
    """Send onboarding completion email immediately (no queue dependency).

    Returns a result dict with keys: status, sent, request_id, and optional error.
    """
    profile = OnboardingProfile.objects.filter(pk=profile_id).first()
    if not profile:
        logger.info(
            "onboarding_email direct profile_missing request_id=%s user_id=%s",
            request_id,
            user_id,
        )
        return {
            "status": "profile_missing",
            "sent": False,
            "request_id": request_id,
        }

    resolved_user_id, resolved_user_email = _resolve_completion_email_recipient(
        profile,
        claimed_user_id=user_id,
        claimed_user_email=user_email,
    )
    configured_backend = (getattr(settings, "EMAIL_BACKEND", "") or "").strip()

    if not resolved_user_email:
        profile.completion_email_status = OnboardingProfile.EMAIL_STATUS_NO_EMAIL
        profile.completion_email_last_error = ""
        profile.completion_email_last_attempt_at = timezone.now()
        profile.save(update_fields=["completion_email_status", "completion_email_last_error", "completion_email_last_attempt_at", "updated_at"])
        logger.info(
            "onboarding_email direct no_email request_id=%s user_id=%s",
            request_id,
            resolved_user_id,
        )
        return {
            "status": OnboardingProfile.EMAIL_STATUS_NO_EMAIL,
            "sent": False,
            "request_id": request_id,
            "email_backend": configured_backend,
        }

    try:
        configured_backend = _assert_email_transport_ready()
        from .views import (
            _build_onboarding_completion_email,
            _build_onboarding_progress_summary,
        )  # local import to avoid circular import

        certificate_cid = "cert_cid"
        asset_base_url = (getattr(settings, "EMAIL_ASSET_BASE_URL", "https://example.com") or "https://example.com").strip().rstrip("/")
        if asset_base_url and not asset_base_url.lower().startswith("https://"):
            asset_base_url = "https://" + asset_base_url.lstrip("/")
        fallback_certificate_preview_src = f"{asset_base_url}/static/images/Certificate_completion.png"

        certificate_context = build_certificate_context(
            display_name=display_name,
            user_id=resolved_user_id,
            request_id=request_id,
            asset_base_url=asset_base_url,
            sent_at=timezone.now(),
        )

        certificate_png = None
        certificate_pdf = None
        certificate_render_warnings = []

        try:
            certificate_png = render_certificate_png(certificate_context)
        except Exception as render_exc:
            certificate_render_warnings.append(_safe_email_error_summary(render_exc))
            logger.warning(
                "onboarding_email certificate PNG render fallback request_id=%s user_id=%s recipient=%s error=%s",
                request_id,
                resolved_user_id,
                resolved_user_email,
                certificate_render_warnings[-1],
                exc_info=True,
            )

        try:
            certificate_pdf = render_certificate_pdf(certificate_context)
        except Exception as render_exc:
            certificate_render_warnings.append(_safe_email_error_summary(render_exc))
            logger.warning(
                "onboarding_email certificate PDF render fallback request_id=%s user_id=%s recipient=%s error=%s",
                request_id,
                resolved_user_id,
                resolved_user_email,
                certificate_render_warnings[-1],
                exc_info=True,
            )

        certificate_render_warning = "; ".join(certificate_render_warnings)

        certificate_preview_src = f"cid:{certificate_cid}" if certificate_png else fallback_certificate_preview_src

        progress_summary = {}
        try:
            progress_summary = _build_onboarding_progress_summary(getattr(profile, "user", None))
        except Exception as progress_exc:
            logger.warning(
                "onboarding_email progress summary fallback request_id=%s user_id=%s recipient=%s error=%s",
                request_id,
                resolved_user_id,
                resolved_user_email,
                _safe_email_error_summary(progress_exc),
                exc_info=True,
            )

        subject, text_body, html_body = _build_onboarding_completion_email(
            display_name,
            certificate_cid=certificate_cid if certificate_png else "",
            certificate_preview_src=certificate_preview_src,
            progress_summary=progress_summary,
        )

        profile.completion_email_last_attempt_at = timezone.now()
        profile.save(update_fields=["completion_email_last_attempt_at", "updated_at"])

        email_message = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@innersparc.local"),
            to=[resolved_user_email],
        )
        email_message.attach_alternative(html_body, "text/html")
        if certificate_png:
            certificate_inline = MIMEImage(certificate_png, _subtype="png")
            certificate_inline.add_header("Content-ID", f"<{certificate_cid}>")
            certificate_inline.add_header("Content-Disposition", "inline", filename="certificate.png")
            email_message.attach(certificate_inline)
        if certificate_pdf:
            email_message.attach("certificate.pdf", certificate_pdf, "application/pdf")
        email_message.send(fail_silently=False)

        now = timezone.now()
        profile.completion_email_status = OnboardingProfile.EMAIL_STATUS_SENT
        profile.completion_email_sent_at = now
        profile.completion_email_last_attempt_at = now
        profile.completion_email_last_error = ""
        profile.save(
            update_fields=[
                "completion_email_status",
                "completion_email_sent_at",
                "completion_email_last_attempt_at",
                "completion_email_last_error",
                "updated_at",
            ]
        )

        logger.info(
            "onboarding_email direct sent request_id=%s user_id=%s recipient=%s",
            request_id,
            resolved_user_id,
            resolved_user_email,
        )
        response_payload = {
            "status": OnboardingProfile.EMAIL_STATUS_SENT,
            "sent": True,
            "request_id": request_id,
            "email_backend": configured_backend,
        }
        if certificate_render_warning:
            response_payload["warning"] = certificate_render_warning
        return response_payload
    except Exception as exc:
        error_summary = _safe_email_error_summary(exc)

        logger.exception(
            "onboarding_email direct exception request_id=%s user_id=%s recipient=%s",
            request_id,
            resolved_user_id,
            resolved_user_email,
        )

        profile.completion_email_status = OnboardingProfile.EMAIL_STATUS_FAILED
        profile.completion_email_last_error = error_summary
        profile.completion_email_last_attempt_at = timezone.now()
        profile.save(
            update_fields=[
                "completion_email_status",
                "completion_email_last_error",
                "completion_email_last_attempt_at",
                "updated_at",
            ]
        )
        logger.info(
            "onboarding_email direct failed request_id=%s user_id=%s recipient=%s error=%s",
            request_id,
            resolved_user_id,
            resolved_user_email,
            error_summary,
        )
        return {
            "status": OnboardingProfile.EMAIL_STATUS_FAILED,
            "sent": False,
            "request_id": request_id,
            "error": error_summary,
            "email_backend": configured_backend,
        }


def send_loom_congratulations_email(user_id, user_email, display_name, request_id):
    configured_backend = _assert_email_transport_ready()
    recipient_email = (user_email or "").strip()
    display_name = (display_name or "").strip() or "Agent"
    subject = "Congratulations — you finished the Loom videos"
    text_body = (
        f"Hello {display_name},\n\n"
        "Amazing work — you have completed the Loom video training section. "
        "Keep up the momentum, and continue reviewing resources in your Inner SPARC portal.\n\n"
        "Best regards,\n"
        "Inner SPARC Team"
    )
    html_body = f"""
<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">
  <h2 style=\"color: #1f5ed8;\">Congratulations, {html.escape(display_name)}!</h2>
  <p>You have completed the Loom video section of your training program. Great job staying on track!</p>
  <p>Keep the momentum going by returning to your Inner SPARC portal and continuing the next steps.</p>
  <p style=\"margin-top: 24px;\">Best regards,<br>Inner SPARC Team</p>
</div>
"""
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@innersparc.local"),
        to=[recipient_email],
    )
    msg.attach_alternative(html_body, "text/html")
    msg.send(fail_silently=False)
    logger.info(
        "loom_congratulations_email sent request_id=%s user_id=%s recipient=%s",
        request_id,
        user_id,
        recipient_email,
    )
    return {
        "status": "sent",
        "sent": True,
        "request_id": request_id,
        "email_backend": configured_backend,
    }


def send_training_inactivity_reminder_email(user_id, user_email, display_name, request_id):
    configured_backend = _assert_email_transport_ready()
    recipient_email = (user_email or "").strip()
    display_name = (display_name or "").strip() or "Agent"
    subject = "Friendly reminder: Continue your Inner SPARC training"
    text_body = (
        f"Hello {display_name},\n\n"
        "We noticed you haven’t completed any training in the last 7 days. "
        "Log back into Inner SPARC to continue your progress and finish your onboarding.\n\n"
        "Best regards,\n"
        "Inner SPARC Team"
    )
    html_body = f"""
<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\">
  <h2 style=\"color: #1f5ed8;\">Hello, {html.escape(display_name)}</h2>
  <p>We noticed you have not completed any training in the last 7 days.</p>
  <p>Please return to your Inner SPARC portal and continue your onboarding so you can stay on track.</p>
  <p style=\"margin-top: 24px;\">Best regards,<br>Inner SPARC Team</p>
</div>
"""
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@innersparc.local"),
        to=[recipient_email],
    )
    msg.attach_alternative(html_body, "text/html")
    msg.send(fail_silently=False)
    logger.info(
        "training_inactivity_reminder_email sent request_id=%s user_id=%s recipient=%s",
        request_id,
        user_id,
        recipient_email,
    )
    return {
        "status": "sent",
        "sent": True,
        "request_id": request_id,
        "email_backend": configured_backend,
    }


# compatibility wrapper for callers using the older send_congrats_email name
def send_congrats_email(profile_id, user_id, user_email, display_name, request_id):
    """Backwards-compatible wrapper for legacy callers."""
    return send_onboarding_completion_email_task(profile_id, user_id, user_email, display_name, request_id)
