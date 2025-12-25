from typing import Any, Dict

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView


class ResponseMixin:
    """Provide a consistent response envelope for success and error."""

    def success(self, data: Any = None, message: str | None = None, status_code: int = status.HTTP_200_OK):
        body: Dict[str, Any] = {"success": True, "data": data}
        if message:
            body["message"] = message
        return Response(body, status=status_code)

    def error(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST, errors: Any = None):
        body: Dict[str, Any] = {"success": False, "message": message}
        if errors is not None:
            body["errors"] = errors
        return Response(body, status=status_code)


class BaseAPIView(ResponseMixin, APIView):
    """Base API view using the standard response envelope."""

    pass
