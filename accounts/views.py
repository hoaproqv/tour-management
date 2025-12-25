from django.contrib.auth import get_user_model
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.serializers import LoginSerializer, RegisterSerializer, UserSerializer
from common.views import BaseAPIView

User = get_user_model()


class RegisterView(BaseAPIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return self.error("Invalid data", errors=serializer.errors)
        user = serializer.save()
        return self.success(UserSerializer(user).data, status.HTTP_201_CREATED)


class LoginView(BaseAPIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return self.error("Invalid credentials", errors=serializer.errors)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        tokens = {"access": str(refresh.access_token), "refresh": str(refresh)}
        return self.success({"tokens": tokens, "user": UserSerializer(user).data})


class MeView(BaseAPIView):
    def get(self, request):
        return self.success(UserSerializer(request.user).data)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def refresh_token(request):
    """Refresh JWT token"""
    refresh_token_value = request.data.get("refresh")
    if not refresh_token_value:
        return BaseAPIView().error("Missing refresh token")
    try:
        refresh = RefreshToken(refresh_token_value)
        data = {"access": str(refresh.access_token), "refresh": str(refresh)}
        return BaseAPIView().success({"tokens": data})
    except Exception:
        return BaseAPIView().error(
            "Invalid refresh token", status_code=status.HTTP_401_UNAUTHORIZED
        )


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def csrf_token(_request):
    """Set CSRF cookie"""
    return BaseAPIView().success({"csrf": "set"})
