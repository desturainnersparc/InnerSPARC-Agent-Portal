import base64
import hashlib
import logging
from datetime import datetime
from functools import lru_cache
from pathlib import Path

from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger(__name__)


def _normalize_asset_base_url(value):
    base = (value or "").strip().rstrip("/")
    if not base:
        return ""
    if not base.lower().startswith("https://"):
        return "https://" + base.lstrip("/")
    return base


def _format_completion_date(sent_at):
    local_value = timezone.localtime(sent_at) if timezone.is_aware(sent_at) else sent_at
    return local_value.strftime("%B %d, %Y")


def _build_certificate_id(user_id, sent_at, request_id):
    year = sent_at.year
    seed = f"{user_id}|{sent_at.isoformat()}|{request_id or ''}"
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    sequence = str(int(digest[:12], 16) % 100000).zfill(5)
    return f"OB-{year}-{sequence}"


@lru_cache(maxsize=1)
def _load_certificate_css():
    css_path = Path(__file__).resolve().parents[1] / "static" / "css" / "certificate.css"
    return css_path.read_text(encoding="utf-8")


@lru_cache(maxsize=1)
def _load_certificate_template_data_url():
    template_path = Path(__file__).resolve().parents[1] / "static" / "images" / "Certificate_completion.png"
    encoded = base64.b64encode(template_path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def build_certificate_context(
    display_name,
    user_id,
    request_id,
    asset_base_url=None,
    sent_at=None,
    certificate_description=None,
):
    completion_dt = sent_at or timezone.now()
    normalized_base = _normalize_asset_base_url(asset_base_url)

    full_name = (display_name or "Agent").strip() or "Agent"
    program_title = "Agent Foundation"
    short_description = (certificate_description or "").strip() or (
        f"Has successfully completed the {program_title} program, demonstrating commitment to financial awareness, "
        "responsible decision-making, and personal growth. We appreciate the dedication and enthusiasm throughout "
        "each step of the learning journey."
    )
    certificate_id = _build_certificate_id(user_id, completion_dt, request_id)

    logo_url = ""
    if normalized_base:
        logo_url = f"{normalized_base}/static/images/innersparc.png"

    return {
        "USER_NAME": full_name,
        "CERTIFICATE_DESCRIPTION": short_description,
        "full_name": full_name,
        "program_title": program_title,
        "certificate_description": short_description,
        "completion_date": _format_completion_date(completion_dt),
        "certificate_id": certificate_id,
        "issued_by": "Gabriel V. Libacao Jr.",
        "issued_title": "CEO / Founder",
        "logo_url": logo_url,
        "certificate_css": _load_certificate_css(),
        "certificate_template_src": _load_certificate_template_data_url(),
    }


def render_certificate_png(certificate_context):
    html_markup = render_to_string("emails/certificate_template.html", certificate_context)

    try:
        from playwright.sync_api import sync_playwright
    except Exception as exc:
        raise RuntimeError("Playwright is required to render certificate PNGs.") from exc

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={"width": 1100, "height": 760, "device_scale_factor": 2})
            page.set_content(html_markup, wait_until="networkidle")
            cert = page.locator(".cert-document").first
            png_bytes = cert.screenshot(type="png")
            if not isinstance(png_bytes, (bytes, bytearray)):
                raise RuntimeError("Playwright screenshot did not return PNG bytes.")
            return bytes(png_bytes)
        finally:
            browser.close()


def _render_certificate_pdf_weasyprint(certificate_context):
    """Render the certificate as a PDF using WeasyPrint (server-friendly, no browser required).

    The template uses data-URL-embedded images so base_url=None is intentional —
    there are no relative URLs to resolve.
    """
    from weasyprint import HTML

    html_markup = render_to_string("emails/certificate_pdf.html", certificate_context)
    pdf_bytes = HTML(string=html_markup, base_url=None).write_pdf()
    return bytes(pdf_bytes)


def _render_certificate_pdf_playwright(certificate_context):
    """Render the certificate as a PDF using Playwright (higher-fidelity, optional)."""
    from playwright.sync_api import sync_playwright

    html_markup = render_to_string("emails/certificate_template.html", certificate_context)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={"width": 1100, "height": 760, "device_scale_factor": 2})
            page.set_content(html_markup, wait_until="networkidle")
            return page.pdf(
                print_background=True,
                width="980px",
                height="680px",
                margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
            )
        finally:
            browser.close()


def _render_certificate_pdf_fallback(certificate_context):
    """Generate a minimal placeholder PDF when render libraries are unavailable."""
    content = (
        b"%PDF-1.4\n"
        b"%\xe2\xe3\xcf\xd3\n"
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n"
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
        b"4 0 obj << /Length 51 >>\nstream\nBT /F1 12 Tf 72 720 Td (Inner SPARC Certificate) Tj ET\nendstream\nendobj\n"
        b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
        b"xref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000061 00000 n \n0000000122 00000 n \n0000000242 00000 n \n0000000310 00000 n \ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n371\n%%EOF\n"
    )
    return content


def render_certificate_pdf(certificate_context):
    """Render the certificate PDF.

    Tries WeasyPrint first (always available as a declared dependency), then
    falls back to Playwright for higher-fidelity output when installed. If
    both renderers fail, returns a minimal placeholder PDF so email delivery
    can still proceed.
    """
    weasy_error = None
    try:
        return _render_certificate_pdf_weasyprint(certificate_context)
    except Exception as exc:
        weasy_error = exc
        logger.warning(
            "certificate_pdf WeasyPrint render failed, trying Playwright fallback: %s",
            exc,
        )

    try:
        return _render_certificate_pdf_playwright(certificate_context)
    except Exception as playwright_exc:
        logger.warning(
            "certificate_pdf Playwright render also failed: %s",
            playwright_exc,
        )
        logger.warning(
            "certificate_pdf rendering failed for both backends; using fallback placeholder PDF."
        )
        return _render_certificate_pdf_fallback(certificate_context)
