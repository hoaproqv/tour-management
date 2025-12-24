from django.conf import settings
from django.utils.deprecation import MiddlewareMixin


class DisableCSRFMiddleware(MiddlewareMixin):
    def process_request(self, request):
        # Chỉ bỏ qua khi đang DEBUG
        if settings.DEBUG and request.path.startswith("/admin"):
            setattr(request, "_dont_enforce_csrf_checks", True)
