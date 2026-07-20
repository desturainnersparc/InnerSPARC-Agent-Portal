from django.utils.deprecation import MiddlewareMixin

from .models import PlatformSecuritySettings


class PortalSessionTimeoutMiddleware(MiddlewareMixin):
	"""Refresh authenticated session expiry from global security settings."""

	def process_request(self, request):
		if not getattr(request, "user", None) or not request.user.is_authenticated:
			return None

		timeout_seconds = PlatformSecuritySettings.get_solo().session_timeout_seconds
		request.session.set_expiry(timeout_seconds)
		return None
