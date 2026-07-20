import base64
import logging
from datetime import date
from functools import lru_cache
from pathlib import Path

from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _load_certificate_css():
    css_path = Path(__file__).resolve().parents[1] / "static" / "css" / "certificate.css"
    return css_path.read_text(encoding="utf-8")


@lru_cache(maxsize=1)
def _load_certificate_template_data_url():
    template_path = Path(__file__).resolve().parents[1] / "static" / "images" / "Certificate_completion.png"
    encoded = base64.b64encode(template_path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def _render_png_with_weasyprint(html_markup, base_url):
    from weasyprint import HTML

    renderer = HTML(string=html_markup, base_url=base_url)

    if hasattr(renderer, "write_png"):
        png_bytes = renderer.write_png()
        if isinstance(png_bytes, (bytes, bytearray)):
            return bytes(png_bytes)

    document = renderer.render()
    if hasattr(document, "write_png"):
        png_bytes = document.write_png()
        if isinstance(png_bytes, (bytes, bytearray)):
            return bytes(png_bytes)

    raise RuntimeError("Installed weasyprint version does not expose PNG rendering APIs.")


def _render_png_with_playwright(html_markup):
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={"width": 1200, "height": 848, "device_scale_factor": 2})
            page.set_content(html_markup, wait_until="networkidle")
            png_bytes = page.locator(".certificate-canvas").screenshot(type="png")
            if not isinstance(png_bytes, (bytes, bytearray)):
                raise RuntimeError("Playwright screenshot did not return PNG bytes.")
            return bytes(png_bytes)
        finally:
            browser.close()


def render_personalized_certificate_png(display_name, issued_on=None, asset_base_url=None, certificate_description=None):
    recipient_name = (display_name or "Agent").strip() or "Agent"
    issued_date = (issued_on or date.today()).strftime("%B %d, %Y")
    short_description = (certificate_description or "").strip() or "Has successfully completed the Employee Onboarding Program."

    context = {
        "USER_NAME": recipient_name,
        "CERTIFICATE_DESCRIPTION": short_description,
        "recipient_name": recipient_name,
        "full_name": recipient_name,
        "certificate_description": short_description,
        "issued_date": issued_date,
        "certificate_css": _load_certificate_css(),
        "certificate_template_src": _load_certificate_template_data_url(),
    }
    html_markup = render_to_string("emails/certificate_template.html", context)

    try:
        return _render_png_with_weasyprint(html_markup, base_url=asset_base_url)
    except Exception as weasy_err:
        logger.warning("Certificate PNG render via WeasyPrint failed; trying Playwright fallback: %s", weasy_err)

    try:
        return _render_png_with_playwright(html_markup)
    except Exception as playwright_err:
        logger.exception("Certificate PNG render failed in all backends: %s", playwright_err)
        raise
