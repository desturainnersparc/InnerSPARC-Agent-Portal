import json
import os
import secrets
import html
import logging
import uuid
import re
from datetime import date, timedelta
from zoneinfo import ZoneInfo
from urllib.parse import urlparse, urlencode, urljoin
from urllib.request import Request, build_opener, HTTPCookieProcessor, urlopen
from django.db import DatabaseError
from django.db.models import DateTimeField, F, OuterRef, Subquery

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.core.validators import validate_email
from django.http import HttpResponse, JsonResponse, StreamingHttpResponse
from django.shortcuts import redirect
from django.urls import reverse
from django.utils.decorators import method_decorator
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST, require_http_methods
from django.views.generic import RedirectView, TemplateView

from .models import (
    AccountLoginSecurityState,
    OnboardingProfile,
    OnboardingStepCompletion,
    PlatformSecuritySettings,
    TrainingComment,
    UserProfile,
)
from .brevo_utils import add_contact_to_brevo


PORTAL_LOGIN_SESSION_KEY = "portal_logged_in"
GOOGLE_OAUTH_STATE_SESSION_KEY = "google_oauth_state"
ALLOWED_ONBOARDING_STEP_KEYS = {
    "beta_intro_welcome_done",
    "beta_step_company_overview_done",
    "beta_video_1_done",
    "beta_video_2_done",
    "beta_video_3_done",
    "beta_video_4_done",
    "beta_video_5_done",
    "beta_video_module13_1_done",
    "beta_video_module13_2_done",
    "beta_video_module13_3_done",
    "beta_video_module13_4_done",
    "beta_video_module13_5_done",
    "beta_step_agent_readiness_quiz_done",
    "beta_step_quiz_result_viewed",
    "beta_step_profile_identity_done",
    "beta_step_agent_requirements_docs_done",
    "beta_step_review_done",
}

TRAINING_VIDEO_STEP_COUNT = 239


def _video_steps_range(start, end):
    return [f"beta_video_{index}_done" for index in range(start, end + 1)]


AGENT_FOUNDATION_MODULE_DEFINITIONS = [
    {"module_number": 1, "module_id": "module_1_welcome", "title": "Welcome", "steps": _video_steps_range(1, 2)},
    {"module_number": 2, "module_id": "module_2_setting_the_stage", "title": "Setting the Stage", "steps": _video_steps_range(3, 7)},
    {"module_number": 3, "module_id": "module_3_money_mindset", "title": "Money Mindset", "steps": _video_steps_range(8, 12)},
    {"module_number": 4, "module_id": "module_4_success_mindset", "title": "Success Mindset", "steps": _video_steps_range(13, 25)},
    {"module_number": 5, "module_id": "module_5_chat_sales", "title": "Chat Sales", "steps": _video_steps_range(26, 44) + ["beta_video_164_done"]},
    {"module_number": 6, "module_id": "module_6_the_opening", "title": "The Opening", "steps": _video_steps_range(45, 49)},
    {"module_number": 7, "module_id": "module_7_probing", "title": "Probing", "steps": _video_steps_range(50, 73)},
    {"module_number": 8, "module_id": "module_8_recap", "title": "Recap", "steps": _video_steps_range(74, 77)},
    {"module_number": 9, "module_id": "module_9_conditioning", "title": "Conditioning", "steps": _video_steps_range(78, 81)},
    {"module_number": 10, "module_id": "module_10_perfect_pitch", "title": "Perfect Pitch", "steps": _video_steps_range(82, 89)},
    {"module_number": 11, "module_id": "module_11_the_close", "title": "The Close", "steps": _video_steps_range(90, 117)},
    {"module_number": 12, "module_id": "module_12_customer_experience", "title": "Customer Experience", "steps": _video_steps_range(118, 120)},
    {"module_number": 13, "module_id": "module_13_objection_handling", "title": "Objection Handling", "steps": _video_steps_range(121, 121)},
    {"module_number": 14, "module_id": "module_14_phone_sales_mastery", "title": "Phone Sales Mastery", "steps": _video_steps_range(122, 153)},
    {"module_number": 15, "module_id": "module_15_face_to_face_strategies", "title": "Face to Face Strategies", "steps": _video_steps_range(154, 163)},
    {"module_number": 16, "module_id": "module_16", "title": "High Ticket Offers", "steps": _video_steps_range(165, 172)},
    {"module_number": 17, "module_id": "module_17", "title": "Sales Beast Mindset", "steps": _video_steps_range(173, 190)},
    {"module_number": 18, "module_id": "module_18", "title": "Sales Culture", "steps": _video_steps_range(191, 210)},
    {"module_number": 19, "module_id": "module_19", "title": "Follow Up", "steps": _video_steps_range(211, 230)},
    {"module_number": 20, "module_id": "module_20", "title": "Monday Sales Rally Archive", "steps": _video_steps_range(231, 237)},
    {"module_number": 21, "module_id": "module_21", "title": "Friday Leadership Session Archive", "steps": _video_steps_range(238, 239)},
]


def get_training_video_step_keys():
    return [f"beta_video_{index}_done" for index in range(1, TRAINING_VIDEO_STEP_COUNT + 1)]


def get_training_video_step_index(step_key):
    match = re.fullmatch(r"beta_video_(\d+)_done", step_key or "")
    if not match:
        return None
    index = int(match.group(1))
    if index < 1 or index > TRAINING_VIDEO_STEP_COUNT:
        return None
    return index


def is_training_video_step_key(step_key):
    return get_training_video_step_index(step_key) is not None


def build_training_video_step_labels(prefix="Video"):
    return {step_key: f"{prefix} {index}" for index, step_key in enumerate(get_training_video_step_keys(), start=1)}


TRAINING_INACTIVITY_REMINDER_DAYS = 7
BETA_TRAINING_INACTIVITY_REMINDER_STEP_KEY = "beta_training_inactivity_reminder_sent"


def get_video_loom_step_keys():
    return [
        "beta_video_module13_1_done",
        "beta_video_module13_2_done",
        "beta_video_module13_3_done",
        "beta_video_module13_4_done",
        "beta_video_module13_5_done",
    ]


def get_all_training_step_keys():
    return get_training_video_step_keys() + get_video_loom_step_keys()


def is_loom_step_key(step_key):
    return step_key in get_video_loom_step_keys()


def get_activity_module_definitions():
    return list(AGENT_FOUNDATION_MODULE_DEFINITIONS) + [
        {
            "title": "VIDEO LOOM",
            "steps": get_video_loom_step_keys(),
        }
    ]


def format_module_completion_label(module_definition):
    title = module_definition.get("title") or "Module"
    module_number = module_definition.get("module_number")
    if module_number is not None:
        return f"Completed Module {module_number}: {title}."
    return f"Completed {title}."

# server-side prerequisites for ordered onboarding flow
ONBOARDING_STEP_DEPENDENCIES = {
    "beta_step_company_overview_done": ["beta_intro_welcome_done"],
    "beta_step_profile_identity_done": ["beta_step_company_overview_done"],
    "beta_step_agent_requirements_docs_done": ["beta_step_profile_identity_done"],
    "beta_video_module13_1_done": ["beta_step_agent_requirements_docs_done"],
    "beta_video_module13_2_done": ["beta_video_module13_1_done"],
    "beta_video_module13_3_done": ["beta_video_module13_2_done"],
    "beta_video_module13_4_done": ["beta_video_module13_3_done"],
    "beta_video_module13_5_done": ["beta_video_module13_4_done"],
    "beta_video_1_done": ["beta_video_module13_5_done"],
    "beta_video_2_done": ["beta_video_1_done"],
    "beta_video_3_done": ["beta_video_2_done"],
    "beta_video_4_done": ["beta_video_3_done"],
    "beta_video_5_done": ["beta_video_4_done"],
    "beta_step_agent_readiness_quiz_done": ["beta_video_5_done"],
    "beta_step_quiz_result_viewed": ["beta_step_agent_readiness_quiz_done"],
    "beta_step_review_done": ["beta_step_quiz_result_viewed"],
}
ALLOWED_UPLOAD_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
ALLOWED_UPLOAD_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/octet-stream",
}
MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024
UPLOAD_CONSTRAINTS_MESSAGE = "Allowed files: .pdf, .jpg, .jpeg, .png (max 10MB)."
AGENT_REQUIREMENT_FILE_FIELDS = {
    "proof_of_education": "Valid Government ID (Primary)",
    "government_clearance_nbi": "Valid Government ID (Secondary)",
    "tin_verification": "TIN Verification",
    "photo_2x2": "2x2 Picture",
    "photo_1x1": "1x1 Picture",
}

PHOTO_2X2_ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg"}
PHOTO_2X2_ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/octet-stream",
}
PHOTO_2X2_CONSTRAINTS_MESSAGE = "Allowed files: .jpg, .jpeg, .png (max 10MB)."
PHOTO_1X1_ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg"}
PHOTO_1X1_ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/octet-stream",
}
PHOTO_1X1_CONSTRAINTS_MESSAGE = "Allowed files: .jpg, .jpeg, .png (max 10MB)."

CHATBOT_SYSTEM_PROMPT = """You are SPARC Assistant, the friendly AI chatbot for Inner SPARC Realty Services - a real estate agency in Dasmarinas, Cavite, Philippines.

COMPANY KNOWLEDGE BASE:
- Office: Blk 26 Lot 4 Phase 3, Avida Residences Sta. Catalina, Brgy. Salawag, Dasmarinas, Cavite, Philippines
- Hours: Monday to Sunday, 9:00 AM - 5:00 PM
- Phone: (046) 458-0706 | 0917-853-4875 (Globe/TM) | 0999-994-3304 (Smart/T&T)
- Email: innersparcrealtyservices@gmail.com
- Properties offered: House and lot, townhouse, condo units in Avida Residences Sta. Catalina and nearby Cavite developments
- Payment: Flexible terms, in-house financing, bank loans available
- Site tripping: Available by appointment; agents personally guide prospective buyers
- The team responds to emails within a few hours during business hours

BEHAVIOR RULES:
- Default to English for greetings and first responses.
- If the user writes in Tagalog, reply in Tagalog.
- If the user writes in Taglish, mirror Taglish naturally.
- Be warm, conversational, and concise (2-4 sentences per reply)
- Understand formal, casual, and Taglish phrasing
- Maintain context across the conversation
- Never fabricate exact prices, lot sizes, or live availability; offer agent follow-up
- If the user asks unrelated or complex topics, politely suggest contacting an Inner SPARC agent for proper assistance

RESPONSE FORMAT - return valid JSON only:
{
    "reply": "message",
    "quickReplies": ["up to 3 options"],
    "gmail": false,
    "gmailSubject": "",
    "gmailBody": ""
}

Set gmail true when user wants site tripping, direct team contact, brochure, price list, or needs escalation.
Return only the JSON object, with no markdown or extra text."""

CHATBOT_MAX_MESSAGES = 14
CHATBOT_MAX_CHARS_PER_MESSAGE = 500
logger = logging.getLogger(__name__)

PORTAL_ADMIN_ROLE_ADMINISTRATOR = "administrator"
PORTAL_ADMIN_ROLE_REVIEWER = "reviewer"
PORTAL_ADMIN_ROLE_LABELS = {
    PORTAL_ADMIN_ROLE_ADMINISTRATOR: "Administrator",
    PORTAL_ADMIN_ROLE_REVIEWER: "Reviewer",
}
PORTAL_REVIEWER_GROUP_NAME = "Portal Reviewers"


def _normalize_portal_admin_role(value):
    role = str(value or "").strip().lower()
    if role == PORTAL_ADMIN_ROLE_REVIEWER:
        return PORTAL_ADMIN_ROLE_REVIEWER
    return PORTAL_ADMIN_ROLE_ADMINISTRATOR


def _get_portal_reviewer_group():
    reviewer_group, _ = Group.objects.get_or_create(name=PORTAL_REVIEWER_GROUP_NAME)
    return reviewer_group


def _get_portal_admin_role_for_user(user):
    if not user or not getattr(user, "is_authenticated", False) or not getattr(user, "is_superuser", False):
        return PORTAL_ADMIN_ROLE_REVIEWER
    if user.groups.filter(name=PORTAL_REVIEWER_GROUP_NAME).exists():
        return PORTAL_ADMIN_ROLE_REVIEWER
    return PORTAL_ADMIN_ROLE_ADMINISTRATOR


def _get_portal_admin_role_label(role):
    return PORTAL_ADMIN_ROLE_LABELS.get(_normalize_portal_admin_role(role), "Administrator")


def _is_portal_administrator(user):
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if not getattr(user, "is_superuser", False):
        return False
    return _get_portal_admin_role_for_user(user) == PORTAL_ADMIN_ROLE_ADMINISTRATOR


def _require_portal_administrator(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {
                "ok": False,
                "message": "Authentication required.",
                "code": "AUTH_REQUIRED",
            },
            status=401,
        )

    if not _is_portal_administrator(request.user):
        return JsonResponse(
            {
                "ok": False,
                "message": "Administrator role is required.",
                "code": "FORBIDDEN",
            },
            status=403,
        )
    return None


def _set_portal_admin_role_for_user(target_user, role):
    normalized_role = _normalize_portal_admin_role(role)
    reviewer_group = _get_portal_reviewer_group()
    if normalized_role == PORTAL_ADMIN_ROLE_REVIEWER:
        target_user.groups.add(reviewer_group)
    else:
        target_user.groups.remove(reviewer_group)
    return normalized_role


def _to_bool(value):
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def _safe_email_error_summary(exc):
    detail = str(exc).strip()
    if detail:
        return f"{exc.__class__.__name__}: {detail}"
    return exc.__class__.__name__


def _get_or_create_onboarding_profile(user):
    profile, _ = OnboardingProfile.objects.get_or_create(user=user)
    return profile


def _normalize_training_module_score(raw_value):
    if raw_value is None:
        return None
    try:
        score = int(raw_value)
    except (TypeError, ValueError):
        raise ValueError("module_score must be an integer between 0 and 100")
    if score < 0 or score > 100:
        raise ValueError("module_score must be an integer between 0 and 100")
    return score


def _maybe_auto_trigger_completion_email(user, request_id):
    """Send the onboarding completion email when all Agent Foundation steps are done.

    Called from portal_onboarding_step_complete as a server-side fallback so the
    email fires even if the frontend JS trigger is missed.  No-ops if:
    - Not all training steps are complete yet
    - The email has already been sent or is currently pending
    - The user has no email address
    """
    all_training_step_keys = set(
        step
        for module in AGENT_FOUNDATION_MODULE_DEFINITIONS
        for step in module.get("steps", [])
    )
    if not all_training_step_keys:
        return

    completed_step_keys = set(
        OnboardingStepCompletion.objects.filter(
            user=user, step_key__in=all_training_step_keys
        ).values_list("step_key", flat=True)
    )
    if not all_training_step_keys.issubset(completed_step_keys):
        return

    profile = _get_or_create_onboarding_profile(user)
    if profile.completion_email_status in (
        OnboardingProfile.EMAIL_STATUS_SENT,
        OnboardingProfile.EMAIL_STATUS_PENDING,
    ):
        logger.debug(
            "auto_completion_email skip status=%s user_id=%s request_id=%s",
            profile.completion_email_status,
            user.pk,
            request_id,
        )
        return

    current_user_email = (getattr(user, "email", "") or "").strip()
    if not current_user_email:
        logger.debug(
            "auto_completion_email skip no_email user_id=%s request_id=%s",
            user.pk,
            request_id,
        )
        return

    user_name = user.get_full_name().strip() if hasattr(user, "get_full_name") else ""
    display_name = user_name or user.get_username()

    profile.completion_email_status = OnboardingProfile.EMAIL_STATUS_PENDING
    profile.completion_email_last_error = ""
    profile.completion_email_last_attempt_at = timezone.now()
    profile.save(
        update_fields=[
            "completion_email_status",
            "completion_email_last_error",
            "completion_email_last_attempt_at",
            "updated_at",
        ]
    )

    try:
        from .tasks import send_congrats_email

        send_congrats_email(
            profile_id=profile.pk,
            user_id=user.pk,
            user_email=current_user_email,
            display_name=display_name,
            request_id=request_id,
        )
        logger.info(
            "auto_completion_email triggered user_id=%s recipient=%s request_id=%s",
            user.pk,
            current_user_email,
            request_id,
        )
    except Exception as exc:
        logger.warning(
            "auto_completion_email failed user_id=%s request_id=%s detail=%s",
            user.pk,
            request_id,
            str(exc),
        )


def _get_last_training_activity_at(user):
    training_keys = set(get_all_training_step_keys())
    if not training_keys:
        return getattr(user, "date_joined", None) or timezone.now()

    latest_completion = (
        OnboardingStepCompletion.objects.filter(user=user, step_key__in=training_keys)
        .order_by("-completed_at")
        .first()
    )
    if latest_completion and latest_completion.completed_at:
        return latest_completion.completed_at
    return getattr(user, "date_joined", None) or timezone.now()


def _has_all_training_steps_completed(user):
    training_keys = set(get_all_training_step_keys())
    if not training_keys:
        return False
    completed_steps = set(
        OnboardingStepCompletion.objects.filter(user=user, step_key__in=training_keys)
        .values_list("step_key", flat=True)
    )
    return training_keys.issubset(completed_steps)


def _maybe_send_loom_completion_email(user, request_id):
    required_loom_steps = set(get_video_loom_step_keys())
    if not required_loom_steps:
        return

    completed_loom_steps = set(
        OnboardingStepCompletion.objects.filter(user=user, step_key__in=required_loom_steps)
        .values_list("step_key", flat=True)
    )
    if not required_loom_steps.issubset(completed_loom_steps):
        return

    current_user_email = (getattr(user, "email", "") or "").strip()
    if not current_user_email:
        logger.debug(
            "loom_congratulations_email skip no_email user_id=%s request_id=%s",
            user.pk,
            request_id,
        )
        return

    display_name = _safe_full_name(user)
    try:
        from .tasks import send_loom_congratulations_email

        send_loom_congratulations_email(
            user_id=user.pk,
            user_email=current_user_email,
            display_name=display_name,
            request_id=request_id,
        )
        logger.info(
            "loom_congratulations_email sent user_id=%s recipient=%s request_id=%s",
            user.pk,
            current_user_email,
            request_id,
        )
    except Exception as exc:
        logger.warning(
            "loom_congratulations_email failed user_id=%s request_id=%s detail=%s",
            user.pk,
            request_id,
            str(exc),
            exc_info=True,
        )


def _maybe_send_training_inactivity_reminder(user, request_id):
    if _has_all_training_steps_completed(user):
        return

    last_activity = _get_last_training_activity_at(user)
    threshold = timezone.now() - timedelta(days=TRAINING_INACTIVITY_REMINDER_DAYS)
    if last_activity and last_activity > threshold:
        return

    reminder_record = OnboardingStepCompletion.objects.filter(
        user=user,
        step_key=BETA_TRAINING_INACTIVITY_REMINDER_STEP_KEY,
    ).first()
    if reminder_record and reminder_record.completed_at and last_activity and reminder_record.completed_at >= last_activity:
        return

    current_user_email = (getattr(user, "email", "") or "").strip()
    if not current_user_email:
        logger.debug(
            "training_inactivity_reminder skip no_email user_id=%s request_id=%s",
            user.pk,
            request_id,
        )
        return

    display_name = _safe_full_name(user)
    try:
        from .tasks import send_training_inactivity_reminder_email

        send_training_inactivity_reminder_email(
            user_id=user.pk,
            user_email=current_user_email,
            display_name=display_name,
            request_id=request_id,
        )
        OnboardingStepCompletion.objects.update_or_create(
            user=user,
            step_key=BETA_TRAINING_INACTIVITY_REMINDER_STEP_KEY,
            defaults={"completed_at": timezone.now()},
        )
        logger.info(
            "training_inactivity_reminder triggered user_id=%s recipient=%s request_id=%s",
            user.pk,
            current_user_email,
            request_id,
        )
    except Exception as exc:
        logger.warning(
            "training_inactivity_reminder failed user_id=%s request_id=%s detail=%s",
            user.pk,
            request_id,
            str(exc),
            exc_info=True,
        )


def _file_metadata(file_field):
    if not file_field:
        return None
    return {
        "name": os.path.basename(file_field.name or ""),
        "url": file_field.url,
    }


def _serialize_onboarding_profile(profile):
    return {
        "residential_address": profile.residential_address or "",
        "valid_government_id": _file_metadata(profile.valid_government_id),
        "training_module_scores": getattr(profile, "training_module_scores", {}) or {},
        "agent_requirement_documents": {
            "valid_government_id_1": _file_metadata(profile.proof_of_education),
            "valid_government_id_2": _file_metadata(profile.government_clearance_nbi),
            "tin_verification": _file_metadata(profile.tin_verification),
            "photo_2x2": _file_metadata(profile.photo_2x2),
            "photo_1x1": _file_metadata(profile.photo_1x1),
        },
    }


def _serialize_account_profile(user):
    phone_number = ""
    birthdate = ""
    gender = ""
    try:
        account_profile = user.profile
        phone_number = account_profile.phone_number or ""
        birthdate_value = getattr(account_profile, "birthdate", None)
        birthdate = birthdate_value.isoformat() if birthdate_value else ""
        gender = getattr(account_profile, "gender", "") or ""
    except ObjectDoesNotExist:
        phone_number = ""
        birthdate = ""
        gender = ""

    return {
        "first_name": getattr(user, "first_name", "") or "",
        "last_name": getattr(user, "last_name", "") or "",
        "email": getattr(user, "email", "") or "",
        "phone_number": phone_number,
        "birthdate": birthdate,
        "gender": gender,
    }


def _serialize_onboarding_payload(profile, user):
    payload = _serialize_onboarding_profile(profile)
    payload["account"] = _serialize_account_profile(user)
    return payload


def _safe_document_url(file_field):
    if not file_field:
        return None
    if not getattr(file_field, "name", ""):
        return None
    try:
        return file_field.url
    except Exception:
        return None


def _safe_full_name(user):
    full_name = ""
    if hasattr(user, "get_full_name"):
        full_name = (user.get_full_name() or "").strip()
    if full_name:
        return full_name
    first_name = (getattr(user, "first_name", "") or "").strip()
    last_name = (getattr(user, "last_name", "") or "").strip()
    combined = f"{first_name} {last_name}".strip()
    if combined:
        return combined
    username = (getattr(user, "username", "") or "").strip()
    if username:
        return username
    return (getattr(user, "email", "") or "").strip()


def _build_onboarding_progress_summary(user):
    if not user or not getattr(user, "pk", None):
        return {
            "headline": "Your onboarding progress is now tracked in real time.",
            "completed_milestones": 0,
            "total_milestones": 0,
            "milestones_percent": 0,
            "completed_training_modules": 0,
            "total_training_modules": len(AGENT_FOUNDATION_MODULE_DEFINITIONS),
            "training_modules_percent": 0,
            "completed_required_steps": 0,
            "total_required_steps": 0,
            "required_steps_percent": 0,
            "snapshot_label": timezone.localtime(timezone.now()).strftime("%B %d, %Y %I:%M %p %Z"),
        }

    completed_steps = set(
        OnboardingStepCompletion.objects.filter(user=user).values_list("step_key", flat=True)
    )

    milestone_groups = [
        {
            "key": "welcome_orientation",
            "label": "Welcome and Orientation",
            "steps": ["beta_intro_welcome_done", "beta_step_company_overview_done"],
        },
        {
            "key": "profile_credentials",
            "label": "Profile and Credentials",
            "steps": ["beta_step_profile_identity_done", "beta_step_agent_requirements_docs_done"],
        },
        {
            "key": "agents_foundation_training",
            "label": "Agents Foundation Training",
            "steps": [
                step
                for module in AGENT_FOUNDATION_MODULE_DEFINITIONS
                for step in module.get("steps", [])
            ],
        },
        {
            "key": "review_activation",
            "label": "Review and Activation",
            "steps": ["beta_step_review_done"],
        },
    ]

    total_milestones = len(milestone_groups)
    completed_milestones = sum(
        1
        for group in milestone_groups
        if group.get("steps") and all(step in completed_steps for step in group["steps"])
    )
    milestones_percent = round((completed_milestones / total_milestones) * 100) if total_milestones else 0

    total_training_modules = len(AGENT_FOUNDATION_MODULE_DEFINITIONS)
    completed_training_modules = 0
    for module in AGENT_FOUNDATION_MODULE_DEFINITIONS:
        module_steps = module.get("steps", [])
        if module_steps and all(step in completed_steps for step in module_steps):
            completed_training_modules += 1
    training_modules_percent = round((completed_training_modules / total_training_modules) * 100) if total_training_modules else 0

    required_steps = {
        step
        for group in milestone_groups
        for step in group.get("steps", [])
        if step
    }
    total_required_steps = len(required_steps)
    completed_required_steps = sum(1 for step in required_steps if step in completed_steps)
    required_steps_percent = round((completed_required_steps / total_required_steps) * 100) if total_required_steps else 0

    if milestones_percent >= 100 and training_modules_percent >= 100:
        headline = "Outstanding work. You have completed all required onboarding milestones."
    elif completed_milestones > 0 and total_milestones > 0:
        headline = f"Great progress. You have completed {completed_milestones} of {total_milestones} onboarding milestones."
    else:
        headline = "Your onboarding progress is now tracked in real time."

    return {
        "headline": headline,
        "completed_milestones": completed_milestones,
        "total_milestones": total_milestones,
        "milestones_percent": milestones_percent,
        "completed_training_modules": completed_training_modules,
        "total_training_modules": total_training_modules,
        "training_modules_percent": training_modules_percent,
        "completed_required_steps": completed_required_steps,
        "total_required_steps": total_required_steps,
        "required_steps_percent": required_steps_percent,
        "snapshot_label": timezone.localtime(timezone.now()).strftime("%B %d, %Y %I:%M %p %Z"),
    }


def _build_onboarding_completion_email(display_name, certificate_cid="cert_cid", certificate_preview_src=None, progress_summary=None):
    escaped_name = html.escape(display_name or "Agent")
    asset_base_url = (getattr(settings, "EMAIL_ASSET_BASE_URL", "https://example.com") or "https://example.com").strip().rstrip("/")
    if not asset_base_url.lower().startswith("https://"):
        asset_base_url = "https://" + asset_base_url.lstrip("/")

    resolved_certificate_preview_src = (certificate_preview_src or "").strip()
    if not resolved_certificate_preview_src and certificate_cid:
        resolved_certificate_preview_src = f"cid:{certificate_cid}"
    if not resolved_certificate_preview_src:
        resolved_certificate_preview_src = f"{asset_base_url}/static/images/Certificate_completion.png"

    certificate_preview_src = resolved_certificate_preview_src
    logo_src = f"{asset_base_url}/static/images/innersparc.png"

    summary = progress_summary if isinstance(progress_summary, dict) else {}
    headline = str(summary.get("headline") or "Congratulations on your onboarding progress update.")

    subject = "Inner SPARC Onboarding Completed"
    text_body = (
        f"Hello {display_name},\n\n"
        f"{headline}\n\n"
        "This update reflects your current saved onboarding progress.\n\n"
        "Your certificate is included below in this message.\n\n"
        "Thank you,\n"
        "Inner SPARC Team"
    )

    html_body = f"""
<!doctype html>
<html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Onboarding Completed</title>
    </head>
    <body style="margin:0;padding:0;background:#eef3fb;font-family:'Segoe UI','Aptos','Helvetica Neue',Arial,sans-serif;color:#14233d;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef3fb;padding:30px 12px;">
            <tr>
                <td align="center">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px;background:#ffffff;border:1px solid #d4dfed;border-radius:18px;overflow:hidden;box-shadow:0 18px 44px rgba(24,54,98,0.14);">
                        <tr>
                            <td style="background:linear-gradient(110deg,#1f5ed8,#3f8cf2 56%,#67b7ff);padding:20px 24px;color:#ffffff;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                    <tr>
                                        <td style="width:52px;vertical-align:middle;">
                                            <img src="{logo_src}" width="40" height="40" alt="Inner SPARC logo" style="display:block;border-radius:11px;background:#ffffff;padding:4px;border:1px solid rgba(255,255,255,0.5);">
                                        </td>
                                        <td style="vertical-align:middle;">
                                            <div style="font-size:28px;font-weight:800;line-height:1.1;letter-spacing:0.2px;">Inner SPARC</div>
                                            <div style="font-size:13px;opacity:0.94;margin-top:4px;letter-spacing:0.4px;text-transform:uppercase;">Onboarding Confirmation</div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:26px 24px 22px;">
                                <p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#1d2f4e;">Hello {escaped_name},</p>
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #d1e7da;border-radius:14px;background:linear-gradient(180deg,#f4fbf6,#edf8f1);margin:0 0 16px;">
                                    <tr>
                                        <td style="width:58px;padding:14px 8px 14px 16px;vertical-align:top;">
                                            <div style="width:42px;height:42px;border-radius:999px;background:#1e9f53;color:#ffffff;font-size:24px;line-height:42px;text-align:center;font-weight:700;">&#10003;</div>
                                        </td>
                                        <td style="padding:14px 16px 14px 4px;vertical-align:middle;">
                                            <div style="font-size:15px;line-height:1.65;color:#193052;"><strong>{html.escape(headline)}</strong><br>This message reflects your live onboarding progress based on completed records in your account.</div>
                                        </td>
                                    </tr>
                                </table>

                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px;border:1px solid #d8e2ef;border-radius:12px;background:#f7faff;overflow:hidden;box-shadow:0 6px 22px rgba(53,91,150,0.10);">
                                    <tr>
                                        <td style="padding:14px 16px 8px;font-size:13px;font-weight:700;color:#3f597a;letter-spacing:0.3px;">Your Completion Certificate</td>
                                    </tr>
                                    <tr>
                                        <td style="padding:0 12px 14px;">
                                            <img src="{certificate_preview_src}" alt="Inner SPARC Certificate" style="display:block;width:100%;height:auto;border-radius:10px;border:1px solid #c9d7ea;background:#ffffff;">
                                        </td>
                                    </tr>
                                </table>
                                <p style="margin:0;font-size:14px;line-height:1.6;color:#223858;">Thank you,<br><strong>Inner SPARC Team</strong></p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:14px 22px;border-top:1px solid #e4ebf5;background:#fbfdff;color:#778aa5;font-size:12px;line-height:1.5;">
                                This is an automated message from Inner SPARC. Please do not reply directly to this email.
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
</html>
"""

    return subject, text_body, html_body


def _send_signup_welcome_email(user):
    if not getattr(user, "email", ""):
        return

    display_name = (getattr(user, "first_name", "") or "").strip() or "there"
    subject = "Welcome to Inner SPARC Portal"
    text_body = (
        f"Hi {display_name},\n\n"
        "Welcome to Inner SPARC Portal. Your account has been created successfully.\n\n"
        "If you need help getting started, you can reply to this email and our team will assist you.\n\n"
        "- Inner SPARC Team"
    )
    html_body = f"""
<div style=\"font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;\">
  <h2 style=\"margin-bottom: 8px;\">Hi {html.escape(display_name)}!</h2>
  <p>Welcome to <strong>Inner SPARC Portal</strong>. Your account has been created successfully.</p>
  <p>If you need help getting started, just reply to this email and our team will assist you.</p>
  <p style=\"margin-top: 24px;\">- Inner SPARC Team</p>
</div>
"""

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@innersparc.local")
    bcc = []
    audit_bcc = getattr(settings, "EMAIL_AUDIT_BCC", "")
    if audit_bcc:
        bcc.append(audit_bcc)

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=from_email,
        to=[user.email],
        bcc=bcc,
    )
    msg.attach_alternative(html_body, "text/html")
    msg.send()

def _validate_upload_file(uploaded_file, field_label):
    if not uploaded_file:
        return None

    ext = os.path.splitext(uploaded_file.name or "")[1].lower()
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        return f"{field_label} is invalid. {UPLOAD_CONSTRAINTS_MESSAGE}"

    content_type = (uploaded_file.content_type or "").lower()
    if content_type and content_type not in ALLOWED_UPLOAD_CONTENT_TYPES:
        return f"{field_label} has an unsupported file type. {UPLOAD_CONSTRAINTS_MESSAGE}"

    if uploaded_file.size > MAX_UPLOAD_SIZE_BYTES:
        return f"{field_label} is too large. {UPLOAD_CONSTRAINTS_MESSAGE}"

    return None


def _replace_profile_file(profile, field_name, uploaded_file):
    if not uploaded_file:
        return

    current_file = getattr(profile, field_name)
    if current_file and current_file.name and current_file.name != uploaded_file.name:
        current_file.delete(save=False)

    getattr(profile, field_name).save(uploaded_file.name, uploaded_file, save=False)


def _validate_photo_2x2_upload(uploaded_file):
    if not uploaded_file:
        return None

    ext = os.path.splitext(uploaded_file.name or "")[1].lower()
    if ext not in PHOTO_2X2_ALLOWED_EXTENSIONS:
        return f"2x2 Picture is invalid. {PHOTO_2X2_CONSTRAINTS_MESSAGE}"

    content_type = (uploaded_file.content_type or "").lower()
    if content_type and content_type not in PHOTO_2X2_ALLOWED_CONTENT_TYPES:
        return f"2x2 Picture has an unsupported file type. {PHOTO_2X2_CONSTRAINTS_MESSAGE}"

    if uploaded_file.size > MAX_UPLOAD_SIZE_BYTES:
        return f"2x2 Picture is too large. {PHOTO_2X2_CONSTRAINTS_MESSAGE}"

    return None


def _validate_photo_1x1_upload(uploaded_file):
    if not uploaded_file:
        return None

    ext = os.path.splitext(uploaded_file.name or "")[1].lower()
    if ext not in PHOTO_1X1_ALLOWED_EXTENSIONS:
        return f"1x1 Picture is invalid. {PHOTO_1X1_CONSTRAINTS_MESSAGE}"

    content_type = (uploaded_file.content_type or "").lower()
    if content_type and content_type not in PHOTO_1X1_ALLOWED_CONTENT_TYPES:
        return f"1x1 Picture has an unsupported file type. {PHOTO_1X1_CONSTRAINTS_MESSAGE}"

    if uploaded_file.size > MAX_UPLOAD_SIZE_BYTES:
        return f"1x1 Picture is too large. {PHOTO_1X1_CONSTRAINTS_MESSAGE}"

    return None


def _role_redirect_url(user):
    if user.is_superuser:
        return reverse("template2")
    return reverse("template_beta")


def _get_platform_security_settings():
    return PlatformSecuritySettings.get_solo()


def _serialize_platform_security_settings(config):
    return {
        "session_timeout_seconds": int(config.session_timeout_seconds),
        "login_attempt_limit": int(config.login_attempt_limit),
        "lockout_minutes": int(config.lockout_minutes),
    }


def _apply_security_session_expiry(request):
    config = _get_platform_security_settings()
    request.session.set_expiry(int(config.session_timeout_seconds))


def _get_login_candidate_user(identifier):
    value = (identifier or "").strip()
    if not value:
        return None

    User = get_user_model()
    username_field = User.USERNAME_FIELD
    lookup = {f"{username_field}__iexact": value}
    user = User.objects.filter(**lookup).first()
    if user:
        return user

    if "@" in value and username_field != "email":
        return User.objects.filter(email__iexact=value).first()
    return None


class PortalLoginRequiredMixin:
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect("sign_in")
        return super().dispatch(request, *args, **kwargs)


class SuperuserRequiredMixin(PortalLoginRequiredMixin):
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return redirect("template_beta")
        return super().dispatch(request, *args, **kwargs)


class HomePageView(TemplateView):
    template_name = "index.html"


class SignInPageView(RedirectView):
    permanent = False

    def get_redirect_url(self, *args, **kwargs):
        return "/?openModal=signin-modal"


class SignUpPageView(RedirectView):
    permanent = False

    def get_redirect_url(self, *args, **kwargs):
        return "/?openModal=signup-modal"


class ForgotPasswordPageView(RedirectView):
    permanent = False

    def get_redirect_url(self, *args, **kwargs):
        return "/?openModal=forgot-modal"


@method_decorator(ensure_csrf_cookie, name="dispatch")
class TemplateBetaPageView(PortalLoginRequiredMixin, TemplateView):
    template_name = "templateBeta.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        try:
            completed_keys = list(
                OnboardingStepCompletion.objects.filter(user=self.request.user)
                .order_by("completed_at")
                .values_list("step_key", flat=True)
            )
        except DatabaseError:
            completed_keys = []
        context["onboarding_completed_steps"] = json.dumps(completed_keys)
        try:
            account_profile = self.request.user.profile
            context["profile_phone_number"] = account_profile.phone_number or ""
            birthdate_value = getattr(account_profile, "birthdate", None)
            context["profile_birthdate"] = birthdate_value.isoformat() if birthdate_value else ""
            context["profile_gender"] = getattr(account_profile, "gender", "") or ""
        except ObjectDoesNotExist:
            context["profile_phone_number"] = ""
            context["profile_birthdate"] = ""
            context["profile_gender"] = ""

        context["profile_photo_2x2_url"] = ""
        try:
            onboarding_profile = self.request.user.onboarding_profile
            photo_2x2_field = getattr(onboarding_profile, "photo_2x2", None)
            if photo_2x2_field and getattr(photo_2x2_field, "name", ""):
                try:
                    context["profile_photo_2x2_url"] = photo_2x2_field.url
                except Exception:
                    context["profile_photo_2x2_url"] = ""
        except ObjectDoesNotExist:
            context["profile_photo_2x2_url"] = ""

        context["onboarding_profile_data_url"] = reverse("portal_onboarding_profile_data")
        context["ONBOARDING_DEV_UNLOCK_ALL"] = bool(getattr(settings, "ONBOARDING_DEV_UNLOCK_ALL", False))
        return context


class Template2PageView(SuperuserRequiredMixin, TemplateView):
    template_name = "template2.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        User = get_user_model()
        
        # Get all non-superuser active users
        all_users = (
            User.objects.filter(is_superuser=False, is_active=True)
            .select_related("onboarding_profile")
            .prefetch_related("onboardingstepcompletion_set")
        )
        total_users = all_users.count()
        
        # Calculate completion metrics for each module
        from django.db.models import Count, Q
        
        # Welcome and Orientation - users who completed beta_intro_welcome_done
        welcome_users = all_users.filter(
            onboardingstepcompletion__step_key='beta_intro_welcome_done'
        ).distinct().count()
        
        # Profile & Credentials - users who completed BOTH profile steps
        profile_users = all_users.filter(
            onboardingstepcompletion__step_key__in=[
                'beta_step_profile_identity_done',
                'beta_step_agent_requirements_docs_done'
            ]
        ).annotate(
            profile_completed=Count(
                'onboardingstepcompletion',
                filter=Q(onboardingstepcompletion__step_key__in=[
                    'beta_step_profile_identity_done',
                    'beta_step_agent_requirements_docs_done'
                ])
            )
        ).filter(profile_completed=2).count()
        
        training_step_keys = get_training_video_step_keys()

        # Agent Foundation - users who completed ALL training videos
        training_users = all_users.filter(
            onboardingstepcompletion__step_key__in=training_step_keys
        ).annotate(
            training_completed=Count(
                'onboardingstepcompletion',
                filter=Q(onboardingstepcompletion__step_key__in=training_step_keys)
            )
        ).filter(training_completed=len(training_step_keys)).count()

        video_loom_step_keys = [
            'beta_video_module13_1_done',
            'beta_video_module13_2_done',
            'beta_video_module13_3_done',
            'beta_video_module13_4_done',
            'beta_video_module13_5_done',
        ]

        # VIDEO LOOM - users who completed all VIDEO LOOM videos
        video_loom_users = all_users.filter(
            onboardingstepcompletion__step_key__in=video_loom_step_keys
        ).annotate(
            video_loom_completed=Count(
                'onboardingstepcompletion',
                filter=Q(onboardingstepcompletion__step_key__in=video_loom_step_keys)
            )
        ).filter(video_loom_completed=len(video_loom_step_keys)).count()

        # Review & Activation - users who completed beta_step_review_done
        review_users = all_users.filter(
            onboardingstepcompletion__step_key='beta_step_review_done'
        ).distinct().count()
        
        context['onboarding_metrics'] = {
            'total_users': total_users,
            'welcome_completed': welcome_users,
            'profile_completed': profile_users,
            'training_completed': training_users,
            'video_loom_completed': video_loom_users,
            'welcome_percent': round((welcome_users / total_users * 100) if total_users > 0 else 0),
            'profile_percent': round((profile_users / total_users * 100) if total_users > 0 else 0),
            'training_percent': round((training_users / total_users * 100) if total_users > 0 else 0),
            'video_loom_percent': round((video_loom_users / total_users * 100) if total_users > 0 else 0),
        }
        
        # Agent Applications Metrics
        from datetime import datetime, timedelta
        
        # Calculate new applications this week
        one_week_ago = timezone.now() - timedelta(days=7)
        new_apps_this_week = all_users.filter(date_joined__gte=one_week_ago).count()
        
        rejected_users = all_users.filter(
            onboardingstepcompletion__step_key='beta_step_application_rejected'
        ).distinct().count()

        # Pending Review = all records that are not in terminal states (approved / rejected)
        pending_review = max(total_users - review_users - rejected_users, 0)

        # Approved users completed review step and are not marked rejected
        approved = all_users.filter(
            onboardingstepcompletion__step_key='beta_step_review_done'
        ).exclude(
            onboardingstepcompletion__step_key='beta_step_application_rejected'
        ).distinct().count()

        rejected = rejected_users
        
        context['agents_metrics'] = {
            'new_applications': new_apps_this_week,
            'pending_review': pending_review,
            'approved': approved,
            'rejected': rejected,
        }

        step_labels = {
            'beta_intro_welcome_done': 'Completed Welcome and Orientation',
            'beta_step_company_overview_done': 'Completed Company Overview',
            'beta_step_agent_readiness_quiz_done': 'Completed Agent Readiness Quiz',
            'beta_step_quiz_result_viewed': 'Viewed Quiz Result',
            'beta_step_profile_identity_done': 'Completed Profile and Identity step',
            'beta_step_agent_requirements_docs_done': 'Submitted Agent Requirements documents',
            'beta_video_module13_1_done': 'Completed Loom Video 1',
            'beta_video_module13_2_done': 'Completed Loom Video 2',
            'beta_video_module13_3_done': 'Completed Loom Video 3',
            'beta_video_module13_4_done': 'Completed Loom Video 4',
            'beta_video_module13_5_done': 'Completed Loom Video 5',
            'beta_step_review_done': 'Completed Review and Activation',
        }

        manila_tz = ZoneInfo("Asia/Manila")

        def to_manila_datetime(value):
            if not value:
                return None
            try:
                if timezone.is_naive(value):
                    value = timezone.make_aware(value, timezone.get_current_timezone())
                return value.astimezone(manila_tz)
            except (ValueError, TypeError, AttributeError):
                return None

        def format_activity_timestamp(value):
            local_value = to_manila_datetime(value)
            if not local_value:
                return 'Timestamp unavailable'
            return local_value.strftime('%b %d, %Y %I:%M %p')
        
        # Build applications list with real user data
        ordered_users = list(all_users.order_by('-date_joined'))
        applications = []
        app_ids_by_user_id = {}
        app_status_by_user_id = {}
        for idx, user in enumerate(ordered_users, start=1):
            # Generate application ID (should ideally be stored in a model)
            app_id = f"APP-{3000 + total_users - idx:04d}"
            
            # Determine status based on completed steps
            step_records = list(user.onboardingstepcompletion_set.all())
            completed_steps = {record.step_key for record in step_records}
            
            if 'beta_step_application_rejected' in completed_steps:
                status = 'Rejected'
                status_class = 'tpl2-status-rejected'
            elif 'beta_step_review_done' in completed_steps:
                status = 'Approved'
                status_class = 'tpl2-status-approved'
            elif 'beta_step_agent_requirements_docs_done' in completed_steps:
                status = 'Under Review'
                status_class = 'tpl2-status-in-review'
            else:
                status = 'In Progress'
                status_class = 'tpl2-status-pending'
            
            applications.append({
                'app_id': app_id,
                'user_id': user.id,
                'name': f'{user.first_name} {user.last_name}'.strip() or user.username,
                'email': user.email,
                'submission_date': user.date_joined.strftime('%b %d, %Y'),
                'status': status,
                'status_class': status_class,
                'completed_steps': list(completed_steps),
            })
            app_ids_by_user_id[user.id] = app_id
            app_status_by_user_id[user.id] = status
        
        context['applications'] = applications

        training_rows = []
        total_training_steps = len(get_training_video_step_keys())
        total_modules = len(AGENT_FOUNDATION_MODULE_DEFINITIONS)
        training_percent_sum = 0
        module_percent_sum = 0
        quiz_completed_count = 0

        for user in ordered_users:
            completed_steps = {record.step_key for record in user.onboardingstepcompletion_set.all()}
            training_completed_count = sum(
                1 for step in completed_steps if is_training_video_step_key(step)
            )
            training_videos_percent = round(
                (training_completed_count / total_training_steps) * 100
            ) if total_training_steps else 0

            completed_modules = 0
            module_scores = []
            module_score_map = {}
            try:
                onboarding_profile = user.onboarding_profile
                module_score_map = getattr(onboarding_profile, 'training_module_scores', {}) or {}
            except ObjectDoesNotExist:
                module_score_map = {}

            for module_def in AGENT_FOUNDATION_MODULE_DEFINITIONS:
                module_steps = module_def.get('steps', []) or []
                completed_count = sum(1 for step in module_steps if step in completed_steps)
                percent = round((completed_count / len(module_steps)) * 100) if module_steps else 0
                module_label = module_def.get('title') or 'Module'
                module_number = module_def.get('module_number')
                module_id = module_def.get('module_id') or (f"module_{module_number}" if module_number is not None else module_label)
                stored_score = module_score_map.get(module_id)
                displayed_score = stored_score if stored_score is not None else percent
                if module_steps and completed_count == len(module_steps):
                    completed_modules += 1
                module_scores.append({
                    'label': f"Module {module_number}: {module_label}" if module_number is not None else module_label,
                    'completed_steps': completed_count,
                    'total_steps': len(module_steps),
                    'percent': percent,
                    'score': displayed_score,
                })

            module_percent = round((completed_modules / total_modules) * 100) if total_modules else 0

            quiz_score = None
            try:
                onboarding_profile = user.onboarding_profile
                quiz_score = getattr(onboarding_profile, 'agent_readiness_quiz_score', None)
            except ObjectDoesNotExist:
                quiz_score = None

            quiz_complete = bool(quiz_score is not None)
            if quiz_complete:
                quiz_completed_count += 1

            training_percent_sum += training_videos_percent
            module_percent_sum += module_percent

            app_status = app_status_by_user_id.get(user.id, 'In Progress')
            app_status_class = (
                'tpl2-status-approved' if app_status == 'Approved' else
                'tpl2-status-rejected' if app_status == 'Rejected' else
                'tpl2-status-in-review' if app_status == 'Under Review' else
                'tpl2-status-pending'
            )

            training_rows.append({
                'user_id': user.id,
                'name': f'{user.first_name} {user.last_name}'.strip() or user.username,
                'email': user.email,
                'training_videos_percent': training_videos_percent,
                'completed_modules': completed_modules,
                'total_modules': total_modules,
                'quiz_completed': 'Yes' if quiz_complete else 'No',
                'quiz_score': quiz_score,
                'module_percent': module_percent,
                'module_scores': module_scores,
                'application_status': app_status,
                'status_class': app_status_class,
            })

        context['training_overview'] = {
            'total_agents': len(training_rows),
            'average_training_percent': round((training_percent_sum / len(training_rows))) if training_rows else 0,
            'average_module_percent': round((module_percent_sum / len(training_rows))) if training_rows else 0,
            'total_modules': total_modules,
            'quiz_completed_count': quiz_completed_count,
            'quiz_completion_rate': round((quiz_completed_count / len(training_rows) * 100)) if training_rows else 0,
        }
        context['agent_training_rows'] = training_rows

        all_events = []
        for user in ordered_users[:30]:
            step_records = list(user.onboardingstepcompletion_set.all().order_by('-completed_at'))
            app_id = app_ids_by_user_id.get(user.id, f"APP-{3000 + user.id:04d}")
            user_name = f'{user.first_name} {user.last_name}'.strip() or user.username
            step_records_by_key = {}

            all_events.append(
                {
                    'kind': 'submission',
                    'kind_label': 'Submission',
                    'timestamp': format_activity_timestamp(user.date_joined),
                    'datetime': user.date_joined,
                    'date_key': (to_manila_datetime(user.date_joined) or timezone.now().astimezone(manila_tz)).date(),
                    'user_name': user_name,
                    'user_email': user.email or 'No email',
                    'application_id': app_id,
                    'status': app_status_by_user_id.get(user.id, 'In Progress'),
                    'message': f'{user_name} submitted application {app_id}.',
                }
            )

            for step_record in step_records:
                existing_step_record = step_records_by_key.get(step_record.step_key)
                if not existing_step_record or (step_record.completed_at and existing_step_record.completed_at and step_record.completed_at > existing_step_record.completed_at):
                    step_records_by_key[step_record.step_key] = step_record

                if step_record.step_key not in step_labels:
                    continue

                all_events.append(
                    {
                        'kind': 'log',
                        'kind_label': 'Activity Log',
                        'timestamp': format_activity_timestamp(step_record.completed_at),
                        'datetime': step_record.completed_at,
                        'date_key': (to_manila_datetime(step_record.completed_at) or timezone.now().astimezone(manila_tz)).date(),
                        'user_name': user_name,
                        'user_email': user.email or 'No email',
                        'application_id': app_id,
                        'status': app_status_by_user_id.get(user.id, 'In Progress'),
                        'message': step_labels.get(step_record.step_key, step_record.step_key),
                    }
                )

            for module in get_activity_module_definitions():
                module_steps = module.get('steps', [])
                if not module_steps or not all(step in step_records_by_key for step in module_steps):
                    continue

                latest_step_record = max(
                    (step_records_by_key[step] for step in module_steps if step in step_records_by_key),
                    key=lambda record: record.completed_at or timezone.now(),
                )
                module_title = module.get('title') or 'Module'
                module_number = module.get('module_number')
                if module_number is not None:
                    module_label = f"Module {module_number}: {module_title}"
                else:
                    module_label = module_title

                all_events.append(
                    {
                        'kind': 'module',
                        'kind_label': 'Module Complete',
                        'timestamp': format_activity_timestamp(latest_step_record.completed_at),
                        'datetime': latest_step_record.completed_at,
                        'date_key': (to_manila_datetime(latest_step_record.completed_at) or timezone.now().astimezone(manila_tz)).date(),
                        'user_name': user_name,
                        'user_email': user.email or 'No email',
                        'application_id': app_id,
                        'status': app_status_by_user_id.get(user.id, 'In Progress'),
                        'message': f'Completed {module_label}.',
                    }
                )

            try:
                onboarding_profile = user.onboarding_profile
            except ObjectDoesNotExist:
                onboarding_profile = None

            if onboarding_profile:
                if onboarding_profile.completion_email_status == OnboardingProfile.EMAIL_STATUS_SENT:
                    confirmation_message = f'Confirmation email sent to {user_name}.'
                    confirmation_timestamp = onboarding_profile.completion_email_sent_at or onboarding_profile.updated_at
                elif onboarding_profile.completion_email_status == OnboardingProfile.EMAIL_STATUS_PENDING:
                    confirmation_message = f'Confirmation email delivery in progress for {user_name}.'
                    confirmation_timestamp = onboarding_profile.completion_email_last_attempt_at or onboarding_profile.updated_at
                elif onboarding_profile.completion_email_status == OnboardingProfile.EMAIL_STATUS_FAILED:
                    confirmation_message = f'Confirmation email delivery failed for {user_name}.'
                    confirmation_timestamp = onboarding_profile.completion_email_last_attempt_at or onboarding_profile.updated_at
                else:
                    confirmation_message = None
                    confirmation_timestamp = None

                if confirmation_message and confirmation_timestamp:
                    all_events.append(
                        {
                            'kind': 'confirmation',
                            'kind_label': 'Confirmation',
                            'timestamp': format_activity_timestamp(confirmation_timestamp),
                            'datetime': confirmation_timestamp,
                            'date_key': (to_manila_datetime(confirmation_timestamp) or timezone.now().astimezone(manila_tz)).date(),
                            'user_name': user_name,
                            'user_email': user.email or 'No email',
                            'application_id': app_id,
                            'status': app_status_by_user_id.get(user.id, 'In Progress'),
                            'message': confirmation_message,
                        }
                    )

        all_events = sorted(all_events, key=lambda event: event['datetime'], reverse=True)

        daily_timeline = {}
        for event in all_events:
            date_key = event['date_key']
            if date_key not in daily_timeline:
                daily_timeline[date_key] = {'events': [], 'date_display': date_key.strftime('%B %d, %Y')}
            daily_timeline[date_key]['events'].append(event)

        timeline_data = [
            {'date': date_key, 'date_display': data['date_display'], 'events': data['events']}
            for date_key, data in sorted(daily_timeline.items(), reverse=True)
        ]

        context['activity_timeline'] = timeline_data
        context['today_date'] = timezone.now().astimezone(manila_tz).date().isoformat()
        context['security_settings'] = _serialize_platform_security_settings(_get_platform_security_settings())
        current_admin_role = _get_portal_admin_role_for_user(self.request.user)
        context['current_admin_role'] = current_admin_role
        context['current_admin_role_label'] = _get_portal_admin_role_label(current_admin_role)
        
        return context


@require_GET
def portal_admin_security_settings(request):
    admin_check = _require_portal_administrator(request)
    if admin_check:
        return admin_check

    config = _get_platform_security_settings()
    return JsonResponse({"ok": True, "settings": _serialize_platform_security_settings(config)})


@require_POST
def portal_admin_security_settings_update(request):
    admin_check = _require_portal_administrator(request)
    if admin_check:
        return admin_check

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        payload = {}

    allowed_timeouts = {
        PlatformSecuritySettings.SESSION_TIMEOUT_15_MIN,
        PlatformSecuritySettings.SESSION_TIMEOUT_30_MIN,
        PlatformSecuritySettings.SESSION_TIMEOUT_1_HOUR,
        PlatformSecuritySettings.SESSION_TIMEOUT_2_HOUR,
    }
    allowed_attempts = {
        PlatformSecuritySettings.LOGIN_ATTEMPTS_3,
        PlatformSecuritySettings.LOGIN_ATTEMPTS_5,
        PlatformSecuritySettings.LOGIN_ATTEMPTS_10,
    }

    try:
        timeout_seconds = int(payload.get("session_timeout_seconds"))
        login_attempt_limit = int(payload.get("login_attempt_limit"))
    except (TypeError, ValueError):
        return JsonResponse(
            {
                "ok": False,
                "message": "Invalid security settings payload.",
            },
            status=400,
        )

    if timeout_seconds not in allowed_timeouts:
        return JsonResponse(
            {
                "ok": False,
                "message": "Unsupported session timeout value.",
            },
            status=400,
        )

    if login_attempt_limit not in allowed_attempts:
        return JsonResponse(
            {
                "ok": False,
                "message": "Unsupported login attempt limit.",
            },
            status=400,
        )

    config = _get_platform_security_settings()
    config.session_timeout_seconds = timeout_seconds
    config.login_attempt_limit = login_attempt_limit
    config.save(update_fields=["session_timeout_seconds", "login_attempt_limit", "updated_at"])

    return JsonResponse({"ok": True, "settings": _serialize_platform_security_settings(config)})


@require_GET
def portal_admin_superusers(request):
    """Fetch superuser accounts with last login information."""
    admin_check = _require_portal_administrator(request)
    if admin_check:
        return admin_check

    User = get_user_model()
    try:
        superusers = User.objects.filter(is_superuser=True).order_by('-last_login', '-date_joined')
    except DatabaseError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "Unable to load superuser accounts right now.",
                "code": "SUPERUSERS_DB_ERROR",
                "detail": str(exc),
            },
            status=500,
        )

    superuser_accounts = []
    for user in superusers:
        last_login_formatted = 'Never'
        if user.last_login:
            try:
                manila_tz = ZoneInfo("Asia/Manila")
                if timezone.is_naive(user.last_login):
                    last_login_aware = timezone.make_aware(user.last_login, timezone.get_current_timezone())
                else:
                    last_login_aware = user.last_login
                last_login_manila = last_login_aware.astimezone(manila_tz)
                last_login_formatted = last_login_manila.strftime('%b %d, %I:%M %p')
            except (ValueError, TypeError, AttributeError):
                last_login_formatted = 'Unable to display'

        superuser_accounts.append({
            'id': user.id,
            'name': _safe_full_name(user),
            'username': user.username,
            'email': user.email or '',
            'role': _get_portal_admin_role_for_user(user),
            'role_label': _get_portal_admin_role_label(_get_portal_admin_role_for_user(user)),
            'last_login': last_login_formatted,
            'is_active': user.is_active,
            'created_at': user.date_joined.isoformat() if user.date_joined else None,
        })

    return JsonResponse({
        "ok": True,
        "superusers": superuser_accounts,
    })


@require_POST
def portal_admin_superuser_role_update(request):
    admin_check = _require_portal_administrator(request)
    if admin_check:
        logger.warning("Portal role update denied for user_id=%s", getattr(request.user, "id", None))
        return admin_check

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        payload = {}

    user_id = payload.get("user_id")
    role = _normalize_portal_admin_role(payload.get("role"))

    if not user_id:
        return JsonResponse({"ok": False, "message": "user_id is required."}, status=400)

    User = get_user_model()
    try:
        target_user = User.objects.get(pk=int(user_id), is_superuser=True)
    except (TypeError, ValueError, User.DoesNotExist):
        return JsonResponse({"ok": False, "message": "Superuser account not found."}, status=404)

    if target_user.id == request.user.id and role == PORTAL_ADMIN_ROLE_REVIEWER:
        return JsonResponse(
            {"ok": False, "message": "You cannot downgrade your own account to Reviewer."},
            status=400,
        )

    applied_role = _set_portal_admin_role_for_user(target_user, role)
    logger.info(
        "Portal role updated actor_id=%s target_id=%s role=%s",
        request.user.id,
        target_user.id,
        applied_role,
    )

    return JsonResponse(
        {
            "ok": True,
            "message": "Role updated successfully.",
            "superuser": {
                "id": target_user.id,
                "role": applied_role,
                "role_label": _get_portal_admin_role_label(applied_role),
            },
        }
    )


@require_POST
def portal_admin_superuser_password_update(request):
    admin_check = _require_portal_administrator(request)
    if admin_check:
        logger.warning("Portal password update denied for user_id=%s", getattr(request.user, "id", None))
        return admin_check

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        payload = {}

    user_id = payload.get("user_id")
    new_password = str(payload.get("password") or "")

    if not user_id:
        return JsonResponse({"ok": False, "message": "user_id is required."}, status=400)
    if not new_password:
        return JsonResponse({"ok": False, "message": "Password is required."}, status=400)

    User = get_user_model()
    try:
        target_user = User.objects.get(pk=int(user_id), is_superuser=True)
    except (TypeError, ValueError, User.DoesNotExist):
        return JsonResponse({"ok": False, "message": "Superuser account not found."}, status=404)

    try:
        validate_password(new_password, user=target_user)
    except ValidationError as exc:
        return JsonResponse({"ok": False, "message": " ".join(exc.messages)}, status=400)

    target_user.set_password(new_password)
    target_user.save(update_fields=["password"])

    logger.info(
        "Portal password updated actor_id=%s target_id=%s",
        request.user.id,
        target_user.id,
    )

    return JsonResponse({"ok": True, "message": "Password changed"})


@require_GET
def portal_admin_notifications(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {
                "ok": False,
                "message": "Authentication required.",
                "code": "AUTH_REQUIRED",
            },
            status=401,
        )

    if not request.user.is_superuser:
        return JsonResponse(
            {
                "ok": False,
                "message": "Forbidden.",
                "code": "FORBIDDEN",
            },
            status=403,
        )

    from datetime import timedelta

    User = get_user_model()
    manila_tz = ZoneInfo("Asia/Manila")
    required_steps = set(ALLOWED_ONBOARDING_STEP_KEYS) | set(get_training_video_step_keys())

    def to_manila_datetime(value):
        if not value:
            return None
        try:
            if timezone.is_naive(value):
                value = timezone.make_aware(value, timezone.get_current_timezone())
            return value.astimezone(manila_tz)
        except (ValueError, TypeError, AttributeError):
            return None

    def relative_time_label(value):
        local_value = to_manila_datetime(value)
        now_local = timezone.now().astimezone(manila_tz)
        if not local_value:
            return "just now"
        delta = now_local - local_value
        seconds = max(int(delta.total_seconds()), 0)
        if seconds < 60:
            return "just now"
        if seconds < 3600:
            minutes = seconds // 60
            return f"{minutes} min{'s' if minutes != 1 else ''} ago"
        if seconds < 86400:
            hours = seconds // 3600
            return f"{hours} hr{'s' if hours != 1 else ''} ago"
        days = seconds // 86400
        return f"{days} day{'s' if days != 1 else ''} ago"

    try:
        users = list(
            User.objects.filter(is_superuser=False, is_active=True)
            .prefetch_related("onboardingstepcompletion_set")
            .order_by("-date_joined")[:50]
        )
    except DatabaseError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "Unable to load notifications right now.",
                "code": "PORTAL_ADMIN_NOTIFICATIONS_DB_ERROR",
                "detail": str(exc),
            },
            status=500,
        )

    notifications = []
    app_ids_by_user_id = {
        user.id: f"APP-{3000 + len(users) - idx:04d}"
        for idx, user in enumerate(users, start=1)
    }

    # New registrations
    for user in users[:8]:
        started_at = to_manila_datetime(user.date_joined)
        notifications.append(
            {
                "kind": "registration",
                "title": f"{_safe_full_name(user)} has started onboarding.",
                "description": "New user registration detected.",
                "timestamp": relative_time_label(started_at),
                "sort_at": started_at,
                "target_section": "accounts",
                "target_type": "account",
                "account_id": f"ACC-{user.pk}",
                "user_id": user.pk,
            }
        )

    # Submitted onboarding requirements
    submitted_records = list(
        OnboardingStepCompletion.objects.filter(
            user__is_superuser=False,
            user__is_active=True,
            step_key="beta_step_agent_requirements_docs_done",
        )
        .select_related("user")
        .order_by("-completed_at")[:8]
    )
    for record in submitted_records:
        submitted_at = to_manila_datetime(record.completed_at)
        notifications.append(
            {
                "kind": "submission",
                "title": f"{_safe_full_name(record.user)} submitted onboarding requirements.",
                "description": "Forms are ready for verification.",
                "timestamp": relative_time_label(submitted_at),
                "sort_at": submitted_at,
                "target_section": "agents",
                "target_type": "application",
                "app_id": app_ids_by_user_id.get(record.user_id),
                "user_id": record.user_id,
            }
        )

    # Activity logs from onboarding milestones
    activity_step_labels = {
        "beta_intro_welcome_done": "completed Welcome and Orientation.",
        "beta_step_company_overview_done": "completed Company Overview.",
        "beta_step_agent_readiness_quiz_done": "completed Agent Readiness Quiz.",
        "beta_step_quiz_result_viewed": "viewed Quiz Result.",
        "beta_step_profile_identity_done": "completed Profile and Identity.",
        "beta_video_module13_1_done": "completed Loom Video 1.",
        "beta_video_module13_2_done": "completed Loom Video 2.",
        "beta_video_module13_3_done": "completed Loom Video 3.",
        "beta_video_module13_4_done": "completed Loom Video 4.",
        "beta_video_module13_5_done": "completed Loom Video 5.",
        "beta_step_review_done": "reached Review and Activation.",
    }
    activity_records = list(
        OnboardingStepCompletion.objects.filter(
            user__is_superuser=False,
            user__is_active=True,
            step_key__in=list(activity_step_labels.keys()),
        )
        .select_related("user")
        .order_by("-completed_at")[:8]
    )
    for record in activity_records:
        activity_at = to_manila_datetime(record.completed_at)
        detail = activity_step_labels.get(record.step_key, "updated onboarding progress.")
        notifications.append(
            {
                "kind": "log",
                "title": f"{_safe_full_name(record.user)} {detail}",
                "description": "Onboarding activity update.",
                "timestamp": relative_time_label(activity_at),
                "sort_at": activity_at,
                "target_section": "agents",
                "target_type": "application",
                "app_id": app_ids_by_user_id.get(record.user_id),
                "user_id": record.user_id,
                "step_key": record.step_key,
            }
        )

    # Completed modules (one notification per module, not per video)
    for user in users:
        step_records = list(user.onboardingstepcompletion_set.all())
        step_records_by_key = {}
        completed_steps = set()
        for record in step_records:
            completed_steps.add(record.step_key)
            existing_step_record = step_records_by_key.get(record.step_key)
            if not existing_step_record or (record.completed_at and existing_step_record.completed_at and record.completed_at > existing_step_record.completed_at):
                step_records_by_key[record.step_key] = record

        for module in get_activity_module_definitions():
            module_steps = module.get("steps", [])
            if not module_steps or not all(step in completed_steps for step in module_steps):
                continue

            latest_step_record = max(
                (step_records_by_key[step] for step in module_steps if step in step_records_by_key),
                key=lambda record: record.completed_at or timezone.now(),
            )
            module_title = module.get("title") or "Module"
            module_number = module.get("module_number")
            if module_number is not None:
                module_name = f"Module {module_number}: {module_title}"
            else:
                module_name = module_title

            completed_at = latest_step_record.completed_at
            notifications.append(
                {
                    "kind": "module",
                    "title": f"{_safe_full_name(user)} completed {module_name}.",
                    "description": "Module completion update.",
                    "timestamp": relative_time_label(completed_at),
                    "sort_at": to_manila_datetime(completed_at) or timezone.now().astimezone(manila_tz),
                    "target_section": "agents",
                    "target_type": "module",
                    "app_id": app_ids_by_user_id.get(user.id),
                    "user_id": user.id,
                    "module_number": module_number,
                }
            )

    # Pending approvals summary
    pending_users = User.objects.filter(
        is_superuser=False,
        is_active=True,
        onboardingstepcompletion__step_key="beta_step_agent_requirements_docs_done",
    ).exclude(
        onboardingstepcompletion__step_key="beta_step_review_done"
    ).distinct()
    pending_count = pending_users.count()
    if pending_count:
        pending_ref = (
            OnboardingStepCompletion.objects.filter(
                user__in=pending_users,
                step_key="beta_step_agent_requirements_docs_done",
            )
            .order_by("-completed_at")
            .values_list("completed_at", flat=True)
            .first()
        )
        notifications.append(
            {
                "kind": "approval",
                "title": f"{pending_count} users are waiting for document verification.",
                "description": "Pending approvals require admin review.",
                "timestamp": relative_time_label(pending_ref),
                "sort_at": to_manila_datetime(pending_ref) or timezone.now().astimezone(manila_tz),
                "target_section": "agents",
            }
        )

    # Reminders for incomplete onboarding
    reminder_cutoff = timezone.now() - timedelta(hours=12)
    reminder_count = 0
    for user in users:
        if reminder_count >= 6:
            break
        completed_steps = {
            record.step_key for record in user.onboardingstepcompletion_set.all()
        }
        missing_steps = len(required_steps - completed_steps)
        if missing_steps <= 0 or user.date_joined >= reminder_cutoff:
            continue
        latest_activity = user.date_joined
        for record in user.onboardingstepcompletion_set.all():
            if record.completed_at and record.completed_at > latest_activity:
                latest_activity = record.completed_at
        notifications.append(
            {
                "kind": "reminder",
                "title": f"Reminder: {_safe_full_name(user)} has incomplete onboarding forms.",
                "description": f"{missing_steps} onboarding step(s) remaining.",
                "timestamp": relative_time_label(latest_activity),
                "sort_at": to_manila_datetime(latest_activity) or timezone.now().astimezone(manila_tz),
                "target_section": "agents",
                "target_type": "application",
                "app_id": app_ids_by_user_id.get(user.id),
                "user_id": user.id,
            }
        )
        reminder_count += 1

    notifications.sort(key=lambda item: item.get("sort_at") or timezone.now().astimezone(manila_tz), reverse=True)
    notifications = notifications[:24]

    for item in notifications:
        item.pop("sort_at", None)

    return JsonResponse(
        {
            "ok": True,
            "unread_count": min(len(notifications), 99),
            "notifications": notifications,
        }
    )


def portal_admin_accounts(request):
    admin_check = _require_portal_administrator(request)
    if admin_check:
        return admin_check

    User = get_user_model()
    review_completion_subquery = (
        OnboardingStepCompletion.objects.filter(
            user_id=OuterRef("pk"),
            step_key="beta_step_review_done",
        )
        .order_by("-completed_at")
        .values("completed_at")[:1]
    )

    try:
        users = (
            User.objects.filter(is_superuser=False)
            .select_related("profile", "onboarding_profile")
            .annotate(
                submitted_at=Subquery(
                    review_completion_subquery,
                    output_field=DateTimeField(),
                )
            )
            .order_by(
                F("submitted_at").desc(nulls_last=True),
                F("date_joined").desc(nulls_last=True),
                "-pk",
            )
        )
    except DatabaseError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "Unable to load accounts right now.",
                "code": "PORTAL_ADMIN_ACCOUNTS_DB_ERROR",
                "detail": str(exc),
            },
            status=500,
        )

    accounts = []
    for user in users:
        try:
            phone_number = user.profile.phone_number or ""
        except ObjectDoesNotExist:
            phone_number = ""

        try:
            onboarding_profile = user.onboarding_profile
        except ObjectDoesNotExist:
            onboarding_profile = None

        documents = {
            "valid_government_id": _safe_document_url(getattr(onboarding_profile, "valid_government_id", None)),
            "proof_of_education": _safe_document_url(getattr(onboarding_profile, "proof_of_education", None)),
            "government_clearance_nbi": _safe_document_url(getattr(onboarding_profile, "government_clearance_nbi", None)),
            "photo_2x2": _safe_document_url(getattr(onboarding_profile, "photo_2x2", None)),
            "photo_1x1": _safe_document_url(getattr(onboarding_profile, "photo_1x1", None)),
            "psa_birth_certificate": _safe_document_url(getattr(onboarding_profile, "psa_birth_certificate", None)),
            "tin_verification": _safe_document_url(getattr(onboarding_profile, "tin_verification", None)),
            "prc_accreditation_id": _safe_document_url(getattr(onboarding_profile, "prc_accreditation_id", None)),
            "dhsud_certificate": _safe_document_url(getattr(onboarding_profile, "dhsud_certificate", None)),
        }

        submitted_at = getattr(user, "submitted_at", None)
        accounts.append(
            {
                "account_id": f"ACC-{user.pk}",
                "user_id": user.pk,
                "full_name": _safe_full_name(user),
                "email": (getattr(user, "email", "") or "").strip(),
                "phone_number": phone_number,
                "residential_address": getattr(onboarding_profile, "residential_address", "") or "",
                "activation_status": "Submitted" if submitted_at else "Pending",
                "submitted_at": submitted_at.isoformat() if submitted_at else None,
                "documents": documents,
            }
        )

    return JsonResponse({"ok": True, "accounts": accounts})


@require_POST
def admin_approve_application(request):
    """Approve an application and send approval email"""
    if not request.user.is_superuser:
        return JsonResponse({"success": False, "message": "Unauthorized"}, status=403)
    
    try:
        data = json.loads(request.body)
        user_id = data.get('user_id')
        name = (data.get('name') or '').strip()
        email = (data.get('email') or '').strip()
        app_id = (data.get('app_id') or '').strip()

        if not user_id:
            return JsonResponse({"success": False, "message": "user_id is required"}, status=400)
        
        User = get_user_model()
        user = User.objects.get(id=user_id)
        user.is_active = True
        user.save(update_fields=['is_active'])

        display_name = name or _safe_full_name(user)
        recipient_email = email or (getattr(user, 'email', '') or '').strip()
        
        # Mark the review step as complete
        OnboardingStepCompletion.objects.get_or_create(
            user=user,
            step_key='beta_step_review_done'
        )

        # Ensure rejected marker is removed once approved.
        OnboardingStepCompletion.objects.filter(
            user=user,
            step_key='beta_step_application_rejected'
        ).delete()
        
        # Send approval email
        subject = 'Your Inner SPARC Application Has Been Approved'
        text_content = (
            f'Hi {display_name},\n\n'
            'Your application has been approved! You can now access your agent portal.\n\n'
            f'Application ID: {app_id or "N/A"}\n\n'
            'Best regards,\nInner SPARC Team'
        )
        html_content = (
            f'<p>Hi {display_name},</p>'
            '<p>Your application has been approved! You can now access your agent portal.</p>'
            f'<p><strong>Application ID:</strong> {html.escape(app_id or "N/A")}</p>'
            '<p>Best regards,<br>Inner SPARC Team</p>'
        )
        
        email_sent = False
        if recipient_email:
            msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [recipient_email])
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=True)
            email_sent = True

        return JsonResponse(
            {
                "success": True,
                "message": "Application approved successfully",
                "email_sent": email_sent,
                "account": {
                    "account_id": f"ACC-{user.pk}",
                    "user_id": user.pk,
                    "full_name": display_name,
                    "email": recipient_email,
                    "activation_status": "Submitted",
                },
            }
        )
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=400)


@require_POST
def admin_reject_application(request):
    """Reject an application and send rejection email"""
    if not request.user.is_superuser:
        return JsonResponse({"success": False, "message": "Unauthorized"}, status=403)
    
    try:
        data = json.loads(request.body)
        user_id = data.get('user_id')
        name = (data.get('name') or '').strip()
        email = (data.get('email') or '').strip()
        reason = (data.get('reason') or '').strip()

        if not user_id:
            return JsonResponse({"success": False, "message": "user_id is required"}, status=400)
        if not reason:
            return JsonResponse({"success": False, "message": "Rejection reason is required"}, status=400)
        
        User = get_user_model()
        user = User.objects.get(id=user_id)

        display_name = name or _safe_full_name(user)
        recipient_email = email or (getattr(user, 'email', '') or '').strip()

        # Mark as rejected and remove approved marker if previously set.
        OnboardingStepCompletion.objects.get_or_create(
            user=user,
            step_key='beta_step_application_rejected'
        )
        OnboardingStepCompletion.objects.filter(
            user=user,
            step_key='beta_step_review_done'
        ).delete()

        onboarding_profile, _ = OnboardingProfile.objects.get_or_create(user=user)
        onboarding_profile.completion_email_last_error = f"Application rejected: {reason}"
        onboarding_profile.completion_email_last_attempt_at = timezone.now()
        onboarding_profile.save(update_fields=['completion_email_last_error', 'completion_email_last_attempt_at', 'updated_at'])

        # Send rejection email
        subject = 'Your Inner SPARC Application Status'
        text_content = (
            f'Hi {display_name},\n\n'
            'Thank you for your interest in Inner SPARC. Unfortunately, your application has not been approved at this time.\n\n'
            f'Reason: {reason}\n\n'
            'You may update and resubmit your requirements.\n\n'
            'Best regards,\nInner SPARC Team'
        )
        html_content = (
            f'<p>Hi {display_name},</p>'
            '<p>Thank you for your interest in Inner SPARC. Unfortunately, your application has not been approved at this time.</p>'
            f'<p><strong>Reason:</strong> {html.escape(reason)}</p>'
            '<p>You may update and resubmit your requirements.</p>'
            '<p>Best regards,<br>Inner SPARC Team</p>'
        )

        email_sent = False
        if recipient_email:
            msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [recipient_email])
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=True)
            email_sent = True

        return JsonResponse(
            {
                "success": True,
                "message": "Application rejected successfully",
                "reason": reason,
                "email_sent": email_sent,
            }
        )
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)}, status=400)


@require_POST
def admin_send_training_reminder(request):
    if not request.user.is_superuser:
        return JsonResponse({"success": False, "message": "Unauthorized"}, status=403)

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"success": False, "message": "Invalid JSON payload."}, status=400)

    user_id = payload.get("user_id")
    if not user_id:
        return JsonResponse({"success": False, "message": "user_id is required."}, status=400)

    User = get_user_model()
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return JsonResponse({"success": False, "message": "User not found."}, status=404)

    recipient_email = (getattr(user, "email", "") or "").strip()
    if not recipient_email:
        return JsonResponse({"success": False, "message": "User does not have an email address."}, status=400)

    training_keys = set(get_all_training_step_keys())
    completed_training_steps = set(
        OnboardingStepCompletion.objects.filter(user=user, step_key__in=training_keys)
        .values_list("step_key", flat=True)
    )

    if len(completed_training_steps) >= len(training_keys):
        return JsonResponse({"success": False, "message": "Training is already complete for this user."}, status=400)

    continue_url = request.build_absolute_uri(reverse("template_beta"))
    display_name = _safe_full_name(user) or user.username or recipient_email
    subject = "Continue your Inner SPARC training"
    text_content = (
        f"Hello {display_name},\n\n"
        "It looks like you haven't continued your training recently. "
        "Click the link below to continue your training now:\n\n"
        f"{continue_url}\n\n"
        "Keep going — you're almost there!\n\n"
        "Best,\nInner SPARC Team"
    )
    html_content = (
        f"<p>Hello {html.escape(display_name)},</p>"
        "<p>It looks like you haven't continued your training recently. "
        "Click the link below to continue your training now:</p>"
        f"<p><a href=\"{html.escape(continue_url)}\">Continue training</a></p>"
        "<p>Keep going — you're almost there!</p>"
        "<p>Best,<br>Inner SPARC Team</p>"
    )

    try:
        msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [recipient_email])
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
    except Exception as exc:
        return JsonResponse({"success": False, "message": str(exc)}, status=500)

    return JsonResponse({"success": True, "message": f"Reminder sent to {display_name}.", "email_sent": True})


@require_GET
def admin_user_files(request, user_id):
    """Get user's submitted files"""
    if not request.user.is_superuser:
        return JsonResponse({"success": False, "message": "Unauthorized"}, status=403)
    
    try:
        User = get_user_model()
        user = User.objects.get(id=user_id)
        
        # Get onboarding profile with files
        onboarding_profile = OnboardingProfile.objects.filter(user=user).first()
        files = []
        
        if onboarding_profile:
            file_fields = [
                'valid_government_id',
                'proof_of_education',
                'government_clearance_nbi',
                'photo_2x2',
                'photo_1x1',
                'psa_birth_certificate',
                'tin_verification',
                'prc_accreditation_id',
                'dhsud_certificate'
            ]

            label_by_field = {
                'valid_government_id': 'Valid Government ID',
                'proof_of_education': 'Valid Government ID (Primary)',
                'government_clearance_nbi': 'Valid Government ID (Secondary)',
                'photo_2x2': '2x2 Picture',
                'photo_1x1': '1x1 Picture',
                'psa_birth_certificate': 'PSA Birth Certificate',
                'tin_verification': 'TIN Verification',
                'prc_accreditation_id': 'PRC Accreditation ID',
                'dhsud_certificate': 'DHSUD Certificate',
            }

            for field_name in file_fields:
                file_field = getattr(onboarding_profile, field_name, None)
                if not file_field or not getattr(file_field, 'name', ''):
                    continue

                file_url = _safe_document_url(file_field)
                if not file_url:
                    continue

                ext = os.path.splitext(file_field.name or '')[1].lower()
                file_type = ext.replace('.', '').upper() if ext else 'FILE'
                files.append({
                    'name': label_by_field.get(field_name, field_name.replace('_', ' ').title()),
                    'type': file_type,
                    'url': file_url,
                    'uploaded_at': 'Uploaded'
                })
        
        return JsonResponse({"files": files})
    except Exception as e:
        return JsonResponse({"files": [], "error": str(e)}, status=400)


@require_GET
def admin_user_progress(request, user_id):
    """Get user's onboarding progress"""
    if not request.user.is_superuser:
        return JsonResponse({"success": False, "message": "Unauthorized"}, status=403)
    
    try:
        User = get_user_model()
        user = User.objects.get(id=user_id)
        
        # Get completed steps
        completed_steps = list(
            OnboardingStepCompletion.objects.filter(user=user).values_list('step_key', flat=True)
        )

        try:
            profile = user.profile
        except ObjectDoesNotExist:
            profile = None

        try:
            onboarding_profile = user.onboarding_profile
        except ObjectDoesNotExist:
            onboarding_profile = None

        birthdate_value = getattr(profile, 'birthdate', None) if profile else None
        birthdate = birthdate_value.isoformat() if birthdate_value else ''
        gender = getattr(profile, 'gender', '') if profile else ''
        photo_2x2_url = ''
        if onboarding_profile:
            photo_2x2_field = getattr(onboarding_profile, 'photo_2x2', None)
            if photo_2x2_field and getattr(photo_2x2_field, 'name', ''):
                try:
                    photo_2x2_url = photo_2x2_field.url
                except Exception:
                    photo_2x2_url = ''
        
        completed_steps_set = set(completed_steps)

        # Map step keys to readable names
        step_labels = {
            'beta_intro_welcome_done': 'Welcome & Orientation',
            'beta_step_company_overview_done': 'Company Overview',
            'beta_step_agent_readiness_quiz_done': 'Agent Readiness Quiz',
            'beta_step_quiz_result_viewed': 'Quiz Result',
            'beta_step_profile_identity_done': 'Profile (Identity)',
            'beta_step_agent_requirements_docs_done': 'Documents & Requirements',
            'beta_step_review_done': 'Review & Activation',
        }
        step_labels.update(build_training_video_step_labels('Training Video'))
        
        readable_steps = [step_labels.get(step, step) for step in completed_steps]

        onboarding_groups = [
            {
                "key": "welcome_orientation",
                "label": "Welcome and Orientation",
                "steps": ["beta_intro_welcome_done", "beta_step_company_overview_done"],
            },
            {
                "key": "profile_credentials",
                "label": "Profile and Credentials",
                "steps": ["beta_step_profile_identity_done", "beta_step_agent_requirements_docs_done"],
            },
            {
                "key": "loom_video",
                "label": "Loom Video",
                "steps": get_video_loom_step_keys(),
            },
            {
                "key": "agents_foundation_training",
                "label": "Agents Foundation Training",
                "steps": [
                    step
                    for module in AGENT_FOUNDATION_MODULE_DEFINITIONS
                    for step in module.get("steps", [])
                ],
            },
        ]

        onboarding_progress = []
        for group in onboarding_groups:
            group_steps = group.get("steps", [])
            total_count = len(group_steps)
            completed_count = sum(1 for step in group_steps if step in completed_steps_set)
            onboarding_progress.append(
                {
                    "key": group.get("key"),
                    "label": group.get("label"),
                    "completed_count": completed_count,
                    "total_count": total_count,
                    "completed": bool(total_count and completed_count == total_count),
                }
            )

        module_rows = []
        total_steps = 0
        total_completed = 0
        completed_modules = 0

        for module in AGENT_FOUNDATION_MODULE_DEFINITIONS:
            module_steps = module.get("steps", [])
            module_total = len(module_steps)
            module_completed = sum(1 for step in module_steps if step in completed_steps_set)
            module_percent = round((module_completed / module_total) * 100) if module_total else 0
            is_completed = bool(module_total and module_completed == module_total)
            if is_completed:
                completed_modules += 1

            total_steps += module_total
            total_completed += module_completed

            module_rows.append(
                {
                    "module_number": module.get("module_number"),
                    "title": module.get("title"),
                    "completed_count": module_completed,
                    "total_count": module_total,
                    "percent": module_percent,
                    "completed": is_completed,
                }
            )

        module_progress_percent = round((completed_modules / len(AGENT_FOUNDATION_MODULE_DEFINITIONS)) * 100)

        score = getattr(onboarding_profile, 'agent_readiness_quiz_score', None) if onboarding_profile else None
        quiz_payload = {
            "score": score,
            "max_score": 100,
            "passed": bool(score is not None and score >= 70),
            "status": "Passed" if score is not None and score >= 70 else ("Needs Improvement" if score is not None else "Not Available"),
        }

        loom_step_keys = get_video_loom_step_keys()
        loom_video_progress = []
        for index, step_key in enumerate(loom_step_keys, start=1):
            completed = step_key in completed_steps_set
            loom_video_progress.append(
                {
                    "step_key": step_key,
                    "label": f"Loom Video {index}",
                    "completed": completed,
                    "percent": 100 if completed else 0,
                    "completed_count": 1 if completed else 0,
                    "total_count": 1,
                }
            )

        return JsonResponse(
            {
                "completed_steps": readable_steps,
                "personal_details": {
                    "full_name": _safe_full_name(user),
                    "email": (getattr(user, 'email', '') or '').strip(),
                    "phone_number": getattr(profile, 'phone_number', '') if profile else '',
                    "residential_address": getattr(onboarding_profile, 'residential_address', '') if onboarding_profile else '',
                    "birthdate": birthdate,
                    "gender": gender,
                    "photo_2x2_url": photo_2x2_url,
                },
                "quiz_results": quiz_payload,
                "onboarding_progress": onboarding_progress,
                "loom_video_progress": loom_video_progress,
                "module_progress": {
                    "percent": module_progress_percent,
                    "completed_count": completed_modules,
                    "total_count": len(AGENT_FOUNDATION_MODULE_DEFINITIONS),
                    "completed_step_count": total_completed,
                    "total_step_count": total_steps,
                    "modules": module_rows,
                },
            }
        )
    except Exception as e:
        return JsonResponse({"completed_steps": [], "error": str(e)}, status=400)


@require_POST
def portal_onboarding_complete(request):
    if not request.user.is_authenticated:
        return JsonResponse({"ok": False, "message": "Authentication required."}, status=401)

    user = request.user
    User = get_user_model()
    current_user_email = (User.objects.filter(pk=user.pk).values_list("email", flat=True).first() or "").strip()
    email_backend = (getattr(settings, "EMAIL_BACKEND", "") or "").strip()
    if hasattr(user, "email"):
        user.email = current_user_email

    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
    force_resend_raw = request.POST.get("force_resend")
    if force_resend_raw is None:
        force_resend_raw = request.GET.get("force_resend")

    if force_resend_raw is None:
        content_type = (request.content_type or "").lower()
        if "application/json" in content_type:
            try:
                parsed_body = json.loads((request.body or b"{}").decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                parsed_body = {}
            force_resend_raw = parsed_body.get("force_resend")

    force_resend = _to_bool(force_resend_raw)
    profile = _get_or_create_onboarding_profile(user)

    if not current_user_email:
        profile.completion_email_status = OnboardingProfile.EMAIL_STATUS_NO_EMAIL
        profile.completion_email_last_error = ""
        profile.completion_email_last_attempt_at = timezone.now()
        profile.save(update_fields=["completion_email_status", "completion_email_last_error", "completion_email_last_attempt_at", "updated_at"])

        logger.info(
            "onboarding_complete email status=no_email request_id=%s user_id=%s recipient=%s force_resend=%s",
            request_id,
            user.pk,
            current_user_email or "",
            force_resend,
        )
        return JsonResponse(
            {
                "ok": True,
                "email_sent": False,
                "email_status": "no_email",
                "recipient_email": current_user_email,
                "email_backend": email_backend,
                "code": "ONBOARDING_COMPLETION_NO_EMAIL",
                "message": "Completion recorded, but no email is registered for this account.",
            }
        )

    user_name = user.get_full_name().strip() if hasattr(user, "get_full_name") else ""
    display_name = user_name or user.get_username()
    # Always attempt a fresh send on activate clicks, even after a previous successful send.
    profile.completion_email_status = OnboardingProfile.EMAIL_STATUS_PENDING
    profile.completion_email_last_error = ""
    profile.completion_email_last_attempt_at = timezone.now()
    if force_resend:
        profile.completion_email_sent_at = None
    profile.save(update_fields=["completion_email_status", "completion_email_last_error", "completion_email_last_attempt_at", "completion_email_sent_at", "updated_at"])

    try:
        from .tasks import send_congrats_email

        send_result = send_congrats_email(
            profile_id=profile.pk,
            user_id=user.pk,
            user_email=current_user_email,
            display_name=display_name,
            request_id=request_id,
        )
    except Exception as exc:
        error_summary = _safe_email_error_summary(exc)
        logger.exception(
            "onboarding_complete email send failure request_id=%s user_id=%s recipient=%s force_resend=%s",
            request_id,
            user.pk,
            current_user_email,
            force_resend,
        )
        profile.completion_email_status = OnboardingProfile.EMAIL_STATUS_FAILED
        profile.completion_email_last_error = error_summary
        profile.completion_email_last_attempt_at = timezone.now()
        profile.save(update_fields=["completion_email_status", "completion_email_last_error", "completion_email_last_attempt_at", "updated_at"])

        logger.info(
            "onboarding_complete email status=failed request_id=%s user_id=%s recipient=%s force_resend=%s error=%s",
            request_id,
            user.pk,
            current_user_email,
            force_resend,
            error_summary,
        )
        return JsonResponse(
            {
                "ok": True,
                "email_sent": False,
                "email_status": "failed",
                "recipient_email": current_user_email,
                "email_backend": email_backend,
                "error": error_summary,
                "code": "ONBOARDING_COMPLETION_EMAIL_FAILED",
                "message": "Activation complete, but confirmation email could not be sent right now. You can retry send.",
                "request_id": request_id,
            },
        )

    response_email_backend = (send_result or {}).get("email_backend") or email_backend
    result_status = (send_result or {}).get("status", "")

    if result_status == OnboardingProfile.EMAIL_STATUS_SENT:
        logger.info(
            "onboarding_complete email status=sent request_id=%s user_id=%s recipient=%s force_resend=%s",
            request_id,
            user.pk,
            current_user_email,
            force_resend,
        )
        return JsonResponse(
            {
                "ok": True,
                "email_sent": True,
                "email_status": "sent",
                "recipient_email": current_user_email,
                "email_backend": response_email_backend,
                "code": "ONBOARDING_COMPLETION_EMAIL_SENT",
                "message": "Activation complete. Confirmation email sent to your account.",
                "request_id": request_id,
            }
        )

    if result_status == OnboardingProfile.EMAIL_STATUS_NO_EMAIL:
        return JsonResponse(
            {
                "ok": True,
                "email_sent": False,
                "email_status": "no_email",
                "recipient_email": current_user_email,
                "email_backend": response_email_backend,
                "code": "ONBOARDING_COMPLETION_NO_EMAIL",
                "message": "Completion recorded, but no email is registered for this account.",
                "request_id": request_id,
            }
        )

    error_summary = (send_result or {}).get("error", "")
    logger.info(
        "onboarding_complete email status=failed request_id=%s user_id=%s recipient=%s force_resend=%s error=%s",
        request_id,
        user.pk,
        current_user_email,
        force_resend,
        error_summary,
    )

    return JsonResponse(
        {
            "ok": True,
            "email_sent": False,
            "email_status": "failed",
            "recipient_email": current_user_email,
            "email_backend": response_email_backend,
            "error": error_summary,
            "code": "ONBOARDING_COMPLETION_EMAIL_FAILED",
            "message": "Activation complete, but confirmation email could not be sent right now. You can retry send.",
            "request_id": request_id,
        }
    )


def portal_onboarding_completion_email_status(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {
                "ok": False,
                "message": "Authentication required.",
                "code": "AUTH_REQUIRED",
            },
            status=401,
        )

    user = request.user
    User = get_user_model()
    current_user_email = (User.objects.filter(pk=user.pk).values_list("email", flat=True).first() or "").strip()
    email_backend = (getattr(settings, "EMAIL_BACKEND", "") or "").strip()
    if hasattr(user, "email"):
        user.email = current_user_email

    profile = _get_or_create_onboarding_profile(user)

    if not current_user_email:
        status = "no_email"
        code = "ONBOARDING_COMPLETION_NO_EMAIL"
        message = "No email is registered for this account."
    elif profile.completion_email_status == OnboardingProfile.EMAIL_STATUS_SENT:
        status = "sent"
        code = "ONBOARDING_COMPLETION_EMAIL_SENT"
        message = "Confirmation email sent to your account."
    elif profile.completion_email_status == OnboardingProfile.EMAIL_STATUS_FAILED:
        status = "failed"
        code = "ONBOARDING_COMPLETION_EMAIL_FAILED"
        message = "Confirmation email delivery failed. Please retry sending."
    elif profile.completion_email_status == OnboardingProfile.EMAIL_STATUS_PENDING:
        status = "pending"
        code = "ONBOARDING_COMPLETION_EMAIL_PENDING"
        message = "Confirmation email delivery is in progress."
    else:
        status = "no_email"
        code = "ONBOARDING_COMPLETION_NO_EMAIL"
        message = "No email is set on your account."

    return JsonResponse(
        {
            "ok": True,
            "email_status": status,
            "recipient_email": current_user_email,
            "email_backend": email_backend,
            "code": code,
            "message": message,
            "last_error": profile.completion_email_last_error or "",
            "last_attempt_at": profile.completion_email_last_attempt_at.isoformat() if profile.completion_email_last_attempt_at else None,
            "sent_at": profile.completion_email_sent_at.isoformat() if profile.completion_email_sent_at else None,
        }
    )


def portal_onboarding_progress(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {
                "ok": False,
                "message": "Authentication required.",
                "code": "AUTH_REQUIRED",
            },
            status=401,
        )

    try:
        completed_steps = list(
            OnboardingStepCompletion.objects.filter(user=request.user)
            .order_by("completed_at")
            .values_list("step_key", flat=True)
        )
    except DatabaseError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "Unable to load onboarding progress right now.",
                "code": "ONBOARDING_DB_NOT_READY",
                "detail": str(exc),
            },
            status=500,
        )

    return JsonResponse({"ok": True, "completed_steps": completed_steps})


@require_GET
def portal_training_video_proxy(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {
                "ok": False,
                "message": "Authentication required.",
                "code": "AUTH_REQUIRED",
            },
            status=401,
        )

    file_id = (request.GET.get("file_id") or "").strip()
    if not re.fullmatch(r"[A-Za-z0-9_-]{10,}", file_id):
        return JsonResponse(
            {
                "ok": False,
                "message": "A valid Google Drive file_id is required.",
                "code": "INVALID_FILE_ID",
            },
            status=400,
        )

    # Google Drive sometimes serves an interstitial HTML page first and requires
    # a confirmation token. Use a cookie-aware opener and retry with confirm token.
    incoming_range = (request.headers.get("Range") or "").strip()
    opener = build_opener(HTTPCookieProcessor())

    def open_drive_stream(confirm_token=""):
        query = {
            "export": "download",
            "id": file_id,
        }
        if confirm_token:
            query["confirm"] = confirm_token

        upstream_headers = {
            "User-Agent": "InnerSPARC-VideoProxy/1.0",
        }
        if incoming_range:
            upstream_headers["Range"] = incoming_range

        upstream_url = f"https://drive.google.com/uc?{urlencode(query)}"
        upstream_request = Request(upstream_url, headers=upstream_headers)
        return opener.open(upstream_request, timeout=30)

    def open_drive_url(full_url):
        upstream_headers = {
            "User-Agent": "InnerSPARC-VideoProxy/1.0",
        }
        if incoming_range:
            upstream_headers["Range"] = incoming_range
        return opener.open(Request(full_url, headers=upstream_headers), timeout=30)

    def extract_drive_download_url(html_text):
        if not html_text:
            return ""

        # Most Drive virus-scan pages include a direct download anchor.
        anchor_match = re.search(
            r'<a[^>]+id="uc-download-link"[^>]+href="([^"]+)"',
            html_text,
            flags=re.IGNORECASE,
        )
        if anchor_match and anchor_match.group(1):
            href = html.unescape(anchor_match.group(1))
            return urljoin("https://drive.google.com", href)

        # Some pages expose a download form with hidden fields.
        form_match = re.search(
            r'<form[^>]+id="download-form"[^>]+action="([^"]+)"[^>]*>(.*?)</form>',
            html_text,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if form_match and form_match.group(1):
            action_url = html.unescape(form_match.group(1))
            form_body = form_match.group(2) or ""
            input_pairs = re.findall(
                r'<input[^>]+name="([^"]+)"[^>]+value="([^"]*)"',
                form_body,
                flags=re.IGNORECASE,
            )
            if input_pairs:
                form_query = urlencode([(name, html.unescape(value)) for name, value in input_pairs])
                separator = "&" if "?" in action_url else "?"
                return f"{action_url}{separator}{form_query}"

        return ""

    try:
        upstream_response = open_drive_stream()
        initial_content_type = (upstream_response.headers.get("Content-Type") or "").lower()
        if "text/html" in initial_content_type:
            # Drive may return virus-scan/interstitial HTML; follow confirm token/link/form.
            html_preview = upstream_response.read(512 * 1024).decode("utf-8", errors="ignore")
            upstream_response.close()
            confirm_match = re.search(r"confirm=([0-9A-Za-z_-]+)", html_preview)
            if confirm_match and confirm_match.group(1):
                upstream_response = open_drive_stream(confirm_match.group(1))
            else:
                follow_url = extract_drive_download_url(html_preview)
                if follow_url:
                    upstream_response = open_drive_url(follow_url)
                else:
                    logger.warning("video_proxy no_confirm_token file_id=%s", file_id)
                    return JsonResponse(
                        {
                            "ok": False,
                            "message": "Video is not publicly shareable from Google Drive.",
                            "code": "VIDEO_PROXY_DRIVE_PERMISSION",
                        },
                        status=502,
                    )
    except Exception as exc:
        logger.warning("video_proxy upstream_error file_id=%s error=%s", file_id, str(exc))
        return JsonResponse(
            {
                "ok": False,
                "message": "Unable to fetch training video right now.",
                "code": "VIDEO_PROXY_UPSTREAM_ERROR",
            },
            status=502,
        )

    def iter_chunks(stream, chunk_size=512 * 1024):  # 512KB is a good balance for most use cases
        try:
            while True:
                chunk = stream.read(chunk_size)
                if not chunk:
                    break
                yield chunk
        finally:
            try:
                stream.close()
            except Exception:
                pass

    upstream_status = getattr(upstream_response, "status", 200) or 200
    response = StreamingHttpResponse(
        iter_chunks(upstream_response),
        status=upstream_status,
        content_type=(upstream_response.headers.get("Content-Type") or "video/mp4"),
    )

    passthrough_headers = [
        "Content-Length",
        "Content-Range",
        "Accept-Ranges",
        "Cache-Control",
        "ETag",
        "Last-Modified",
    ]
    for header_name in passthrough_headers:
        value = upstream_response.headers.get(header_name)
        if value:
            response[header_name] = value

    response["Access-Control-Allow-Origin"] = request.build_absolute_uri("/").rstrip("/")
    response["X-Content-Type-Options"] = "nosniff"
    response["Content-Disposition"] = "inline"
    return response


def portal_onboarding_profile_data(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {
                "ok": False,
                "message": "Authentication required.",
            },
            status=401,
        )

    try:
        profile = _get_or_create_onboarding_profile(request.user)
    except DatabaseError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "Unable to load onboarding profile right now.",
                "code": "ONBOARDING_PROFILE_DB_ERROR",
                "detail": str(exc),
            },
            status=500,
        )

    try:
        _maybe_send_training_inactivity_reminder(
            request.user,
            request.headers.get("X-Request-ID") or uuid.uuid4().hex,
        )
    except Exception as exc:
        logger.warning(
            "training_inactivity_reminder error user_id=%s detail=%s",
            request.user.pk,
            str(exc),
        )

    return JsonResponse(
        {
            "ok": True,
            "message": "Onboarding profile loaded.",
            "data": _serialize_onboarding_payload(profile, request.user),
        }
    )


@require_POST
def portal_onboarding_profile_identity_save(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {
                "ok": False,
                "message": "Authentication required.",
            },
            status=401,
        )

    try:
        profile = _get_or_create_onboarding_profile(request.user)
    except DatabaseError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "Unable to access onboarding profile right now.",
                "code": "ONBOARDING_PROFILE_DB_ERROR",
                "detail": str(exc),
                "field_errors": {
                    "phone_number": "Database schema is not ready. Please apply migrations and try again.",
                },
            },
            status=500,
        )

    first_name = (request.POST.get("first_name") or "").strip()
    last_name = (request.POST.get("last_name") or "").strip()
    email = (request.POST.get("email") or "").strip().lower()
    phone_number = (request.POST.get("phone_number") or "").strip()
    digits = "".join(ch for ch in phone_number if ch.isdigit())
    birthdate_raw = (request.POST.get("birthdate") or "").strip()
    gender = (request.POST.get("gender") or "").strip().lower()
    residential_address = (request.POST.get("residential_address") or "").strip()

    allowed_gender_values = {
        UserProfile.GENDER_MALE,
        UserProfile.GENDER_FEMALE,
        UserProfile.GENDER_PREFER_NOT_TO_SAY,
    }

    field_errors = {}
    if not first_name:
        field_errors["first_name"] = "First name is required."
    if not last_name:
        field_errors["last_name"] = "Last name is required."

    if not email:
        field_errors["email"] = "Email is required."
    else:
        try:
            validate_email(email)
        except ValidationError:
            field_errors["email"] = "Please enter a valid email address."

    if len(digits) != 10:
        field_errors["phone_number"] = "Please enter a valid 10-digit phone number."

    parsed_birthdate = None
    if not birthdate_raw:
        field_errors["birthdate"] = "Birthdate is required."
    else:
        try:
            parsed_birthdate = date.fromisoformat(birthdate_raw)
        except ValueError:
            field_errors["birthdate"] = "Please enter a valid birthdate."

    if not gender:
        field_errors["gender"] = "Gender is required."
    elif gender not in allowed_gender_values:
        field_errors["gender"] = "Please select a valid gender option."

    User = get_user_model()
    if email:
        username_field = User.USERNAME_FIELD
        username_lookup = {f"{username_field}__iexact": email}
        username_qs = User.objects.filter(**username_lookup).exclude(pk=request.user.pk)
        email_qs = User.objects.filter(email__iexact=email).exclude(pk=request.user.pk) if hasattr(User, "email") else User.objects.none()

        if username_qs.exists() or email_qs.exists():
            field_errors["email"] = "An account with this email already exists."

    if not residential_address:
        field_errors["residential_address"] = "Residential address is required."

    if field_errors:
        return JsonResponse(
            {
                "ok": False,
                "message": "Please correct the highlighted fields.",
                "field_errors": field_errors,
            },
            status=400,
        )

    try:
        user = request.user
        user_update_fields = []

        if hasattr(user, "first_name"):
            user.first_name = first_name
            user_update_fields.append("first_name")
        if hasattr(user, "last_name"):
            user.last_name = last_name
            user_update_fields.append("last_name")
        if hasattr(user, "email"):
            user.email = email
            user_update_fields.append("email")

        username_field = User.USERNAME_FIELD
        if username_field == "email":
            setattr(user, username_field, email)
            if username_field not in user_update_fields:
                user_update_fields.append(username_field)

        if user_update_fields:
            user.save(update_fields=user_update_fields)

        account_profile, _ = UserProfile.objects.get_or_create(user=user)
        account_profile.phone_number = digits
        account_profile.birthdate = parsed_birthdate
        account_profile.gender = gender
        account_profile.save(update_fields=["phone_number", "birthdate", "gender"])

        profile.residential_address = residential_address
        profile.save()
    except DatabaseError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "Profile & Identity could not be saved right now.",
                "code": "ONBOARDING_PROFILE_SAVE_DB_ERROR",
                "detail": str(exc),
                "field_errors": {
                    "phone_number": "Database schema is not ready. Please apply migrations and try again.",
                },
            },
            status=500,
        )

    return JsonResponse(
        {
            "ok": True,
            "message": "Profile and identity saved successfully.",
            "data": _serialize_onboarding_payload(profile, request.user),
        }
    )


@require_POST
def portal_onboarding_agent_documents_save(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {
                "ok": False,
                "message": "Authentication required.",
            },
            status=401,
        )

    try:
        profile = _get_or_create_onboarding_profile(request.user)
    except DatabaseError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "Unable to access onboarding documents right now.",
                "code": "ONBOARDING_DOCS_DB_ERROR",
                "detail": str(exc),
                "field_errors": {
                    "proof_of_education": "Database schema is not ready. Please apply migrations and try again.",
                },
            },
            status=500,
        )

    field_errors = {}

    uploaded_files = {}
    for field_name, field_label in AGENT_REQUIREMENT_FILE_FIELDS.items():
        uploaded_file = request.FILES.get(field_name)
        uploaded_files[field_name] = uploaded_file

        if field_name == "photo_2x2":
            upload_error = _validate_photo_2x2_upload(uploaded_file)
        elif field_name == "photo_1x1":
            upload_error = _validate_photo_1x1_upload(uploaded_file)
        else:
            upload_error = _validate_upload_file(uploaded_file, field_label)
        if upload_error:
            field_errors[field_name] = upload_error

        if not uploaded_file and not getattr(profile, field_name):
            field_errors[field_name] = f"{field_label} is required."

    if field_errors:
        return JsonResponse(
            {
                "ok": False,
                "message": "Please upload all required documents.",
                "field_errors": field_errors,
            },
            status=400,
        )

    try:
        for field_name in AGENT_REQUIREMENT_FILE_FIELDS:
            if uploaded_files[field_name]:
                _replace_profile_file(profile, field_name, uploaded_files[field_name])
        profile.save()
    except DatabaseError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "Agent requirement documents could not be saved right now.",
                "code": "ONBOARDING_DOCS_SAVE_DB_ERROR",
                "detail": str(exc),
                "field_errors": {
                    "proof_of_education": "Database schema is not ready. Please apply migrations and try again.",
                },
            },
            status=500,
        )

    return JsonResponse(
        {
            "ok": True,
            "message": "Agent requirement documents saved successfully.",
            "data": _serialize_onboarding_payload(profile, request.user),
        }
    )


@require_POST
def portal_onboarding_avatar_upload(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {
                "ok": False,
                "message": "Authentication required.",
            },
            status=401,
        )

    try:
        profile = _get_or_create_onboarding_profile(request.user)
    except DatabaseError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "Unable to access avatar settings right now.",
                "code": "ONBOARDING_AVATAR_DB_ERROR",
                "detail": str(exc),
                "field_errors": {
                    "photo_2x2": "Database schema is not ready. Please apply migrations and try again.",
                },
            },
            status=500,
        )

    uploaded_file = request.FILES.get("photo_2x2")
    field_errors = {}

    upload_error = _validate_photo_2x2_upload(uploaded_file)
    if upload_error:
        field_errors["photo_2x2"] = upload_error

    if not uploaded_file:
        field_errors["photo_2x2"] = "2x2 Picture is required."

    if field_errors:
        return JsonResponse(
            {
                "ok": False,
                "message": "Please upload a valid 2x2 picture.",
                "field_errors": field_errors,
            },
            status=400,
        )

    try:
        _replace_profile_file(profile, "photo_2x2", uploaded_file)
        profile.save(update_fields=["photo_2x2"])
    except DatabaseError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "Avatar could not be saved right now.",
                "code": "ONBOARDING_AVATAR_SAVE_DB_ERROR",
                "detail": str(exc),
                "field_errors": {
                    "photo_2x2": "Database schema is not ready. Please apply migrations and try again.",
                },
            },
            status=500,
        )

    return JsonResponse(
        {
            "ok": True,
            "message": "Avatar updated successfully.",
            "data": _serialize_onboarding_payload(profile, request.user),
        }
    )


@require_POST
def portal_onboarding_step_complete(request):
    if not request.user.is_authenticated:
        logger.warning("onboarding_step_complete auth_required")
        return JsonResponse(
            {
                "ok": False,
                "message": "Authentication required.",
                "code": "AUTH_REQUIRED",
            },
            status=401,
        )

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        logger.warning("onboarding_step_complete invalid_json user_id=%s detail=%s", request.user.pk, str(exc))
        return JsonResponse(
            {
                "ok": False,
                "message": "Invalid JSON payload.",
                "code": "INVALID_JSON",
                "detail": str(exc),
            },
            status=400,
        )

    step_key = payload.get("step_key")
    raw_score = payload.get("score")
    raw_module_score = payload.get("module_score")
    module_id = payload.get("module_id")
    completion_reason = str(payload.get("completion_reason") or "").strip().lower()
    if not isinstance(step_key, str) or not step_key.strip():
        logger.warning("onboarding_step_complete missing_step_key user_id=%s", request.user.pk)
        return JsonResponse(
            {
                "ok": False,
                "message": "step_key is required.",
                "code": "STEP_KEY_REQUIRED",
            },
            status=400,
        )

    step_key = step_key.strip()
    dev_unlock_all = bool(getattr(settings, "ONBOARDING_DEV_UNLOCK_ALL", False))
    if (not dev_unlock_all) and not (step_key in ALLOWED_ONBOARDING_STEP_KEYS or is_training_video_step_key(step_key)):
        logger.warning("onboarding_step_complete invalid_step_key user_id=%s step_key=%s", request.user.pk, step_key)
        return JsonResponse(
            {
                "ok": False,
                "message": "Invalid step_key.",
                "code": "INVALID_STEP_KEY",
                "detail": step_key,
            },
            status=400,
        )

    score = None
    if raw_score is not None:
        try:
            score = int(raw_score)
        except (TypeError, ValueError):
            return JsonResponse(
                {
                    "ok": False,
                    "message": "score must be an integer between 0 and 100.",
                    "code": "INVALID_SCORE",
                },
                status=400,
            )
        if score < 0 or score > 100:
            return JsonResponse(
                {
                    "ok": False,
                    "message": "score must be an integer between 0 and 100.",
                    "code": "INVALID_SCORE",
                },
                status=400,
            )

    module_score = None
    if raw_module_score is not None:
        try:
            module_score = _normalize_training_module_score(raw_module_score)
        except ValueError as exc:
            return JsonResponse(
                {
                    "ok": False,
                    "message": str(exc),
                    "code": "INVALID_MODULE_SCORE",
                },
                status=400,
            )

    if is_training_video_step_key(step_key) and module_score is None:
        if completion_reason != "watch_complete":
            return JsonResponse(
                {
                    "ok": False,
                    "message": "Training videos require watch_complete completion_reason.",
                    "code": "VIDEO_COMPLETION_REASON_REQUIRED",
                    "allowed_reasons": ["watch_complete"],
                },
                status=400,
            )

    try:
        # enforce strict server-side prerequisite ordering
        deps = None
        if not dev_unlock_all:
            video_index = get_training_video_step_index(step_key)
            deps = ONBOARDING_STEP_DEPENDENCIES.get(step_key)
            if deps is None and video_index is not None and video_index > 1:
                deps = [f"beta_video_{video_index - 1}_done"]
        if deps:
            existing = set(
                OnboardingStepCompletion.objects.filter(
                    user=request.user, step_key__in=deps
                ).values_list("step_key", flat=True)
            )
            missing = [d for d in deps if d not in existing]
            if missing:
                logger.warning(
                    "attempt to complete locked step user=%s step=%s missing=%s",
                    request.user.pk,
                    step_key,
                    missing,
                )
                return JsonResponse(
                    {
                        "ok": False,
                        "message": "Prerequisite steps not complete.",
                        "code": "STEP_LOCKED",
                        "missing": missing,
                    },
                    status=400,
                )

        if step_key == "beta_step_agent_readiness_quiz_done" and score is not None:
            onboarding_profile = _get_or_create_onboarding_profile(request.user)
            onboarding_profile.agent_readiness_quiz_score = score
            if module_score is not None and isinstance(module_id, str) and module_id.strip():
                module_scores = dict(getattr(onboarding_profile, 'training_module_scores', {}) or {})
                module_scores[module_id.strip()] = module_score
                onboarding_profile.training_module_scores = module_scores
            onboarding_profile.save(update_fields=["agent_readiness_quiz_score", "training_module_scores", "updated_at"])
        elif module_score is not None:
            if not isinstance(module_id, str) or not module_id.strip():
                return JsonResponse(
                    {
                        "ok": False,
                        "message": "module_id is required when sending module_score.",
                        "code": "MODULE_ID_REQUIRED",
                    },
                    status=400,
                )
            onboarding_profile = _get_or_create_onboarding_profile(request.user)
            module_scores = dict(getattr(onboarding_profile, 'training_module_scores', {}) or {})
            module_scores[module_id.strip()] = module_score
            onboarding_profile.training_module_scores = module_scores
            onboarding_profile.save(update_fields=["training_module_scores", "updated_at"])

        completion_record, created = OnboardingStepCompletion.objects.get_or_create(user=request.user, step_key=step_key)
        if created and step_key in get_video_loom_step_keys():
            try:
                _maybe_send_loom_completion_email(
                    request.user,
                    request.headers.get("X-Request-ID") or uuid.uuid4().hex,
                )
            except Exception as exc:
                logger.warning(
                    "loom_congratulations_email error user_id=%s step_key=%s detail=%s",
                    request.user.pk,
                    step_key,
                    str(exc),
                )
    except DatabaseError as exc:
        logger.exception("onboarding_step_complete db_error user_id=%s step_key=%s", request.user.pk, step_key)
        return JsonResponse(
            {
                "ok": False,
                "message": "Unable to save onboarding progress right now.",
                "code": "ONBOARDING_DB_NOT_READY",
                "detail": str(exc),
            },
            status=500,
        )

    logger.info("onboarding_step_complete saved user_id=%s step_key=%s", request.user.pk, step_key)

    # Server-side fallback: send completion email if all Agent Foundation steps are now done.
    if is_training_video_step_key(step_key) or step_key in ALLOWED_ONBOARDING_STEP_KEYS or is_loom_step_key(step_key):
        try:
            _maybe_auto_trigger_completion_email(
                request.user,
                request.headers.get("X-Request-ID") or uuid.uuid4().hex,
            )
        except Exception as exc:
            logger.warning(
                "auto_completion_email error user_id=%s step_key=%s detail=%s",
                request.user.pk,
                step_key,
                str(exc),
            )

    return JsonResponse({"ok": True, "step_key": step_key})


@require_POST
def portal_signup(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        payload = {}

    first_name = (payload.get("first_name") or "").strip()
    last_name = (payload.get("last_name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    phone = (payload.get("phone") or "").strip()
    password = payload.get("password") or ""
    confirm_password = payload.get("confirm_password") or ""
    terms_accepted = bool(payload.get("terms_accepted"))

    errors = {}

    if not first_name or not last_name:
        errors["name"] = "First and last name are required."

    if not email:
        errors["email"] = "Email is required."
    else:
        try:
            validate_email(email)
        except ValidationError:
            errors["email"] = "Please enter a valid email address."

    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) != 10:
        errors["phone"] = "Please enter a valid 10-digit phone number."

    if len(password) < 8:
        errors["password"] = "Password must be at least 8 characters."
    elif password != confirm_password:
        errors["password"] = "Passwords do not match."

    if not terms_accepted:
        errors["terms"] = "You must agree to the terms."

    User = get_user_model()

    if email:
        username_field = User.USERNAME_FIELD
        username_lookup = {f"{username_field}__iexact": email}

        if User.objects.filter(**username_lookup).exists():
            errors["email"] = "An account with this email already exists."
        elif hasattr(User, "email") and User.objects.filter(email__iexact=email).exists():
            errors["email"] = "An account with this email already exists."

    if errors:
        return JsonResponse(
            {
                "ok": False,
                "message": "Please correct the highlighted fields.",
                "field_errors": errors,
            },
            status=400,
        )

    create_kwargs = {"password": password}
    username_field = User.USERNAME_FIELD
    create_kwargs[username_field] = email

    if hasattr(User, "email"):
        create_kwargs["email"] = email
    if hasattr(User, "first_name"):
        create_kwargs["first_name"] = first_name
    if hasattr(User, "last_name"):
        create_kwargs["last_name"] = last_name

    user = User.objects.create_user(**create_kwargs)
    user.is_superuser = False
    user.is_staff = False
    user.save(update_fields=["is_superuser", "is_staff"])

    UserProfile.objects.get_or_create(
        user=user,
        defaults={"phone_number": digits},
    )

    email_sent = True
    try:
        _send_signup_welcome_email(user)
        logger.info("signup welcome email sent user_id=%s email=%s", user.pk, user.email)
    except Exception as exc:
        email_sent = False
        logger.warning(
            "signup welcome email failed user_id=%s email=%s error=%s",
            user.pk,
            user.email,
            _safe_email_error_summary(exc),
        )

    # Sign in newly registered users immediately and route them to Template Beta.
    login(request, user)
    _apply_security_session_expiry(request)
    request.session[PORTAL_LOGIN_SESSION_KEY] = True
    request.session["portal_is_superuser"] = False

    return JsonResponse(
        {
            "ok": True,
            "message": "Account created successfully.",
            "email_sent": email_sent,
            "email_target": user.email,
            "redirect_url": _role_redirect_url(user),
        }
    )


@require_POST
def portal_account_update(request):
    if not request.user.is_authenticated:
        return JsonResponse({"ok": False, "message": "Authentication required."}, status=401)

    payload = {}
    if request.content_type == 'application/json':
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
        except (json.JSONDecodeError, UnicodeDecodeError):
            payload = {}

    def read_value(key):
        if key in payload:
            return payload.get(key)
        return request.POST.get(key)

    first_name = (read_value("first_name") or "").strip()
    last_name = (read_value("last_name") or "").strip()
    email = (read_value("email") or "").strip().lower()
    phone_number = (read_value("phone_number") or "").strip()
    birthdate_raw = (read_value("birthdate") or "").strip()
    gender = (read_value("gender") or "").strip().lower()
    digits = "".join(ch for ch in phone_number if ch.isdigit())

    allowed_gender_values = {
        UserProfile.GENDER_MALE,
        UserProfile.GENDER_FEMALE,
        UserProfile.GENDER_PREFER_NOT_TO_SAY,
    }

    errors = {}
    if not first_name:
        errors["first_name"] = "First name is required."
    if not last_name:
        errors["last_name"] = "Last name is required."

    if not email:
        errors["email"] = "Email is required."
    else:
        try:
            validate_email(email)
        except ValidationError:
            errors["email"] = "Please enter a valid email address."

    if len(digits) != 10:
        errors["phone_number"] = "Please enter a valid 10-digit phone number."

    parsed_birthdate = None
    if not birthdate_raw:
        errors["birthdate"] = "Birthdate is required."
    else:
        try:
            parsed_birthdate = date.fromisoformat(birthdate_raw)
        except ValueError:
            errors["birthdate"] = "Please enter a valid birthdate."

    if not gender:
        errors["gender"] = "Gender is required."
    elif gender not in allowed_gender_values:
        errors["gender"] = "Please select a valid gender option."

    user = request.user
    User = get_user_model()
    if email:
        username_field = User.USERNAME_FIELD
        username_lookup = {f"{username_field}__iexact": email}
        username_qs = User.objects.filter(**username_lookup).exclude(pk=user.pk)
        email_qs = User.objects.filter(email__iexact=email).exclude(pk=user.pk) if hasattr(User, "email") else User.objects.none()

        if username_qs.exists() or email_qs.exists():
            errors["email"] = "An account with this email already exists."

    if errors:
        return JsonResponse(
            {
                "ok": False,
                "message": "Please correct the highlighted fields.",
                "field_errors": errors,
            },
            status=400,
        )

    update_fields = []
    if hasattr(user, "first_name"):
        user.first_name = first_name
        update_fields.append("first_name")
    if hasattr(user, "last_name"):
        user.last_name = last_name
        update_fields.append("last_name")
    if hasattr(user, "email"):
        user.email = email
        update_fields.append("email")

    username_field = User.USERNAME_FIELD
    if username_field == "email":
        setattr(user, username_field, email)
        if username_field not in update_fields:
            update_fields.append(username_field)

    if update_fields:
        user.save(update_fields=update_fields)

    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.phone_number = digits
    profile.birthdate = parsed_birthdate
    profile.gender = gender
    profile.save(update_fields=["phone_number", "birthdate", "gender"])

    return JsonResponse(
        {
            "ok": True,
            "message": "Account details updated successfully.",
            "phone_number": profile.phone_number,
            "birthdate": profile.birthdate.isoformat() if profile.birthdate else "",
            "gender": profile.gender or "",
            "first_name": getattr(user, "first_name", "") or "",
            "last_name": getattr(user, "last_name", "") or "",
            "email": getattr(user, "email", "") or "",
        }
    )


@require_POST
def portal_login(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        payload = {}

    identifier = (payload.get("email") or "").strip()
    password = payload.get("password") or ""
    if not identifier or not password:
        return JsonResponse(
            {"ok": False, "message": "Email and password are required."},
            status=400,
        )

    config = _get_platform_security_settings()
    candidate_user = _get_login_candidate_user(identifier)
    security_state = None
    now = timezone.now()

    if candidate_user:
        security_state, _ = AccountLoginSecurityState.objects.get_or_create(user=candidate_user)
        if security_state.lockout_until and security_state.lockout_until > now:
            return JsonResponse(
                {
                    "ok": False,
                    "message": (
                        f"Account is temporarily locked. Try again after "
                        f"{config.lockout_minutes} minute(s)."
                    ),
                    "code": "ACCOUNT_LOCKED",
                    "lockout_until": security_state.lockout_until.isoformat(),
                },
                status=423,
            )
        if security_state.lockout_until and security_state.lockout_until <= now:
            security_state.lockout_until = None
            security_state.save(update_fields=["lockout_until", "updated_at"])

    # First try the submitted identifier directly as username.
    user = authenticate(request, username=identifier, password=password)

    # If identifier looks like email, try resolving username by email.
    if user is None and "@" in identifier:
        User = get_user_model()
        matched_user = User.objects.filter(email__iexact=identifier).first()
        if matched_user:
            user = authenticate(request, username=matched_user.get_username(), password=password)

    if user is None:
        if security_state:
            next_attempt_count = int(security_state.failed_attempts) + 1
            update_fields = ["failed_attempts", "last_failed_at", "updated_at"]
            security_state.failed_attempts = next_attempt_count
            security_state.last_failed_at = now

            if next_attempt_count >= int(config.login_attempt_limit):
                security_state.lockout_until = now + timedelta(minutes=int(config.lockout_minutes))
                security_state.failed_attempts = 0
                update_fields.append("lockout_until")

            security_state.save(update_fields=update_fields)

        return JsonResponse(
            {"ok": False, "message": "Invalid email or password."},
            status=401,
        )

    if security_state and (security_state.failed_attempts or security_state.lockout_until):
        security_state.failed_attempts = 0
        security_state.lockout_until = None
        security_state.last_failed_at = None
        security_state.save(update_fields=["failed_attempts", "lockout_until", "last_failed_at", "updated_at"])

    login(request, user)
    _apply_security_session_expiry(request)
    request.session[PORTAL_LOGIN_SESSION_KEY] = True
    request.session["portal_is_superuser"] = bool(user.is_superuser)

    return JsonResponse({"ok": True, "redirect_url": _role_redirect_url(user)})


@require_GET
def portal_auth_status(request):
    if not request.user.is_authenticated:
        return JsonResponse({"ok": True, "authenticated": False})

    return JsonResponse(
        {
            "ok": True,
            "authenticated": True,
            "redirect_url": _role_redirect_url(request.user),
        }
    )


@require_POST
def portal_logout(request):
    logout(request)
    request.session.pop(PORTAL_LOGIN_SESSION_KEY, None)
    request.session.pop("portal_is_superuser", None)
    return JsonResponse({"ok": True})


def _get_firebase_app():
    """Initialize Firebase Admin SDK once using the service account key."""
    import firebase_admin
    from firebase_admin import credentials

    if not firebase_admin._apps:
        cred_path = getattr(settings, "FIREBASE_ADMIN_CREDENTIALS", None)
        if not cred_path or not os.path.exists(str(cred_path)):
            raise RuntimeError(
                "Firebase service account key not found. "
                "Go to Firebase Console -> Project Settings -> Service Accounts "
                "-> Generate new private key, save as "
                "'firebase-service-account.json' in the project root, "
                "then set FIREBASE_ADMIN_CREDENTIALS in settings.py."
            )
        firebase_admin.initialize_app(credentials.Certificate(str(cred_path)))
    return firebase_admin.get_app()


def _google_oauth_redirect_uri(request):
    request_based = request.build_absolute_uri(reverse("portal_google_callback"))
    configured = (getattr(settings, "GOOGLE_OAUTH_REDIRECT_URI", "") or "").strip()
    if not configured:
        return request_based

    # Avoid cross-host callback/session mismatches: only use configured URI when
    # it matches the current request host (e.g., localhost vs 127.0.0.1).
    configured_parts = urlparse(configured)
    request_parts = urlparse(request_based)
    if (
        configured_parts.scheme == request_parts.scheme
        and configured_parts.netloc == request_parts.netloc
    ):
        return configured

    return request_based


def portal_google_start(request):
    client_id = (getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "") or "").strip()
    if not client_id:
        return HttpResponse("Missing GOOGLE_OAUTH_CLIENT_ID in Django settings.", status=500)

    state = secrets.token_urlsafe(24)
    request.session[GOOGLE_OAUTH_STATE_SESSION_KEY] = state

    auth_params = {
        "client_id": client_id,
        "redirect_uri": _google_oauth_redirect_uri(request),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
        "access_type": "online",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(auth_params)
    return redirect(url)


def portal_google_callback(request):
    expected_state = request.session.pop(GOOGLE_OAUTH_STATE_SESSION_KEY, "")
    received_state = (request.GET.get("state") or "").strip()
    if not expected_state or expected_state != received_state:
        return HttpResponse("Google OAuth state mismatch. Please try again.", status=400)

    if request.GET.get("error"):
        err = request.GET.get("error")
        return HttpResponse(f"Google sign-in failed: {err}", status=400)

    code = (request.GET.get("code") or "").strip()
    if not code:
        return HttpResponse("Google sign-in did not return an authorization code.", status=400)

    client_id = (getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "") or "").strip()
    client_secret = (getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "") or "").strip()
    redirect_uri = _google_oauth_redirect_uri(request)

    missing = []
    if not client_id:
        missing.append("GOOGLE_OAUTH_CLIENT_ID")
    if not client_secret:
        missing.append("GOOGLE_OAUTH_CLIENT_SECRET")
    if missing:
        return HttpResponse(
            f"Missing {', '.join(missing)} in Django settings.",
            status=500,
        )

    token_payload = urlencode(
        {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
    ).encode("utf-8")

    try:
        token_req = Request(
            "https://oauth2.googleapis.com/token",
            data=token_payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        with urlopen(token_req, timeout=10) as response:
            token_data = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        return HttpResponse(f"Unable to exchange Google auth code: {exc}", status=401)

    access_token = (token_data.get("access_token") or "").strip()
    if not access_token:
        return HttpResponse("Google token exchange did not return an access token.", status=401)

    try:
        info_req = Request(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        with urlopen(info_req, timeout=10) as response:
            userinfo = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        return HttpResponse(f"Unable to read Google user info: {exc}", status=401)

    email = (userinfo.get("email") or "").strip().lower()
    full_name = (userinfo.get("name") or "").strip()
    first_name = (full_name.split(" ", 1)[0] if full_name else "")

    if not email:
        return HttpResponse("Google account has no email address.", status=400)

    User = get_user_model()
    user = User.objects.filter(email__iexact=email).first()

    if not user:
        name_parts = full_name.split(" ", 1)
        first_name = name_parts[0] if name_parts else ""
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        username_field = User.USERNAME_FIELD
        create_kwargs = {username_field: email}
        if hasattr(User, "email"):
            create_kwargs["email"] = email
        if hasattr(User, "first_name"):
            create_kwargs["first_name"] = first_name
        if hasattr(User, "last_name"):
            create_kwargs["last_name"] = last_name

        user = User(**create_kwargs)
        user.set_unusable_password()
        user.save()

    print("=== BREVO FUNCTION CALLED ===")
    add_contact_to_brevo(email, first_name)

    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    request.session[PORTAL_LOGIN_SESSION_KEY] = True
    request.session["portal_is_superuser"] = bool(user.is_superuser)

    return redirect(_role_redirect_url(user))


@csrf_exempt
@require_POST
def portal_firebase_login(request):
    """Bridge a verified Firebase ID token into a Django session."""
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        payload = {}

    id_token = (payload.get("id_token") or "").strip()
    if not id_token:
        return JsonResponse({"ok": False, "message": "ID token required."}, status=400)

    try:
        _get_firebase_app()
        from firebase_admin import auth as firebase_auth
        decoded_token = firebase_auth.verify_id_token(id_token)
    except Exception as exc:
        return JsonResponse({"ok": False, "message": str(exc)}, status=401)

    email = (decoded_token.get("email") or "").strip().lower()
    name = decoded_token.get("name") or ""

    if not email:
        return JsonResponse(
            {"ok": False, "message": "Google account has no email address."},
            status=400,
        )

    User = get_user_model()
    user = User.objects.filter(email__iexact=email).first()
    first_name = (name.split(" ", 1)[0] if name else "")

    if not user:
        name_parts = name.split(" ", 1)
        first_name = name_parts[0] if name_parts else ""
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        username_field = User.USERNAME_FIELD
        create_kwargs = {username_field: email}
        if hasattr(User, "email"):
            create_kwargs["email"] = email
        if hasattr(User, "first_name"):
            create_kwargs["first_name"] = first_name
        if hasattr(User, "last_name"):
            create_kwargs["last_name"] = last_name

        user = User(**create_kwargs)
        user.set_unusable_password()
        user.save()

    print("=== BREVO FUNCTION CALLED ===")
    add_contact_to_brevo(email, first_name)

    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    request.session[PORTAL_LOGIN_SESSION_KEY] = True
    request.session["portal_is_superuser"] = bool(user.is_superuser)

    return JsonResponse({"ok": True, "redirect_url": _role_redirect_url(user)})


@require_POST
def portal_ai_chat(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        payload = {}

    messages = payload.get("messages") or []
    if not isinstance(messages, list):
        return JsonResponse(
            {
                "ok": False,
                "message": "messages must be an array.",
            },
            status=400,
        )

    cleaned_messages = []
    for item in messages:
        if not isinstance(item, dict):
            continue

        role = (item.get("role") or "").strip().lower()
        content = item.get("content")
        if role not in {"user", "assistant"}:
            continue
        if not isinstance(content, str) or not content.strip():
            continue

        text = content.strip()
        if len(text) > CHATBOT_MAX_CHARS_PER_MESSAGE:
            text = text[:CHATBOT_MAX_CHARS_PER_MESSAGE]

        cleaned_messages.append({"role": role, "content": text})

    if len(cleaned_messages) > CHATBOT_MAX_MESSAGES:
        cleaned_messages = cleaned_messages[-CHATBOT_MAX_MESSAGES:]

    if not cleaned_messages:
        return JsonResponse(
            {
                "ok": False,
                "message": "At least one valid message is required.",
            },
            status=400,
        )

    groq_api_key = (getattr(settings, "GROQ_API_KEY", "") or "").strip()
    groq_model = (getattr(settings, "GROQ_MODEL", "") or "llama-3.3-70b-versatile").strip()
    if not groq_api_key:
        return JsonResponse(
            {
                "ok": False,
                "message": "Groq API key is not configured on the server.",
                "code": "AI_API_KEY_MISSING",
            },
            status=503,
        )

    groq_messages = [{"role": "system", "content": CHATBOT_SYSTEM_PROMPT}]
    groq_messages.extend(cleaned_messages)

    model_candidates = getattr(settings, "GROQ_MODEL_FALLBACKS", None) or [groq_model]
    model_candidates = [m for m in model_candidates if isinstance(m, str) and m.strip()]

    normalized_data = None
    last_error = None

    for candidate_model in model_candidates:
        groq_payload = {
            "model": candidate_model.strip(),
            "messages": groq_messages,
            "max_tokens": max(200, int(getattr(settings, "GROQ_MAX_TOKENS", 700) or 700)),
            "temperature": 0.3,
        }

        try:
            groq_request = Request(
                "https://api.groq.com/openai/v1/chat/completions",
                data=json.dumps(groq_payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {groq_api_key}",
                },
                method="POST",
            )

            with urlopen(groq_request, timeout=25) as response:
                raw = response.read().decode("utf-8")
                groq_data = json.loads(raw)

            choices = groq_data.get("choices") if isinstance(groq_data, dict) else None
            first_choice = choices[0] if isinstance(choices, list) and choices else {}
            first_message = first_choice.get("message") if isinstance(first_choice, dict) else {}
            assistant_text = first_message.get("content") if isinstance(first_message, dict) else ""
            if not isinstance(assistant_text, str):
                assistant_text = ""

            # Keep frontend contract stable: return Anthropic-like content array.
            normalized_data = {
                "content": [
                    {
                        "text": assistant_text,
                    }
                ],
                "model": candidate_model.strip(),
            }
            break
        except Exception as exc:
            last_error = exc

    if normalized_data is None:
        return JsonResponse(
            {
                "ok": False,
                "message": "Unable to reach Groq API right now.",
                "detail": str(last_error) if last_error else "Unknown Groq request failure.",
                "code": "AI_REQUEST_FAILED",
            },
            status=502,
        )

    return JsonResponse({"ok": True, "data": normalized_data})


def serialize_comment(comment, request_user):
    full_name = (comment.user.get_full_name() or comment.user.username).strip()
    parent_username = None
    if comment.parent_id and comment.parent:
        parent_username = (comment.parent.user.get_full_name() or comment.parent.user.username).strip()
    created_at = comment.created_at
    if timezone.is_naive(created_at):
        created_at = timezone.make_aware(created_at, timezone.get_default_timezone())
    # Get photo_2x2 URL if available
    photo_url = None
    if hasattr(comment.user, 'onboarding_profile') and comment.user.onboarding_profile:
        onboarding_profile = comment.user.onboarding_profile
        if onboarding_profile.photo_2x2:
            photo_url = onboarding_profile.photo_2x2.url

    return {
        "id": comment.id,
        "text": comment.text,
        "username": full_name,
        "user_id": comment.user.id,
        "created_at": comment.created_at.strftime("%b %d, %I:%M %p"),
        "created_at_ms": int(created_at.timestamp() * 1000),
        "created_at_iso": created_at.isoformat(),
        "is_mine": comment.user_id == getattr(request_user, "id", None),
        "photo_url": photo_url,
        "parent_id": comment.parent_id,
        "parent_username": parent_username,
        "parent_text_preview": comment.parent.text[:60] if comment.parent_id and comment.parent else None,
    }


@login_required
@require_http_methods(["GET"])
def comments_list(request):
    module_id = (request.GET.get("module_id") or "").strip()
    if not module_id:
        return JsonResponse({"ok": False, "message": "module_id required"}, status=400)

    comments = (
        TrainingComment.objects
        .filter(module_id=module_id)
        .select_related("user", "parent", "parent__user")
        .order_by("-created_at", "-id")
    )
    return JsonResponse(
        {
            "ok": True,
            "comments": [serialize_comment(comment, request.user) for comment in comments],
        }
    )


@login_required
@require_http_methods(["POST"])
def comments_create(request):
    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        return JsonResponse({"ok": False, "message": "Invalid JSON"}, status=400)

    module_id = str(data.get("module_id") or "").strip()
    text = str(data.get("text") or "").strip()
    parent_id = data.get("parent_id")
    if not module_id or not text:
        return JsonResponse(
            {"ok": False, "message": "module_id and text are required"},
            status=400,
        )

    parent = None
    if parent_id:
        try:
            parent = TrainingComment.objects.select_related("user").get(id=parent_id, module_id=module_id)
        except TrainingComment.DoesNotExist:
            return JsonResponse({"ok": False, "message": "Parent comment not found"}, status=404)

    comment = TrainingComment.objects.create(user=request.user, module_id=module_id, text=text, parent=parent)
    comment = TrainingComment.objects.select_related("user", "parent", "parent__user").get(id=comment.id)
    return JsonResponse(
        {
            "ok": True,
            "comment": serialize_comment(comment, request.user),
        },
        status=201,
    )


@login_required
@require_http_methods(["PATCH"])
def comments_edit(request, comment_id):
    try:
        comment = TrainingComment.objects.select_related("user").get(id=comment_id)
    except TrainingComment.DoesNotExist:
        return JsonResponse({"ok": False, "message": "Not found"}, status=404)

    if comment.user_id != request.user.id:
        return JsonResponse({"ok": False, "message": "Forbidden"}, status=403)

    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        return JsonResponse({"ok": False, "message": "Invalid JSON"}, status=400)

    text = str(data.get("text") or "").strip()
    if not text:
        return JsonResponse({"ok": False, "message": "text is required"}, status=400)

    comment.text = text
    comment.save(update_fields=["text", "updated_at"])
    return JsonResponse({"ok": True, "comment": serialize_comment(comment, request.user)})


@login_required
@require_http_methods(["DELETE"])
def comments_delete(request, comment_id):
    try:
        comment = TrainingComment.objects.get(id=comment_id)
    except TrainingComment.DoesNotExist:
        return JsonResponse({"ok": False, "message": "Not found"}, status=404)

    if comment.user_id != request.user.id:
        return JsonResponse({"ok": False, "message": "Forbidden"}, status=403)

    comment.delete()
    return JsonResponse({"ok": True})


