from django.contrib.auth import get_user_model
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import permissions, serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.serializers import (
    CsrfSerializer,
    LoginResponseSerializer,
    LoginSerializer,
    RefreshTokenSerializer,
    RegisterSerializer,
    TokenPairSerializer,
    UserSerializer,
)
from common.views import BaseAPIView

User = get_user_model()


class RegisterView(BaseAPIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    serializer_class = RegisterSerializer

    @extend_schema(
        summary="Register new user",
        description="Create a new user account.",
        request=RegisterSerializer,
        responses={
            201: inline_serializer(
                name="RegisterResponse",
                fields={
                    "success": serializers.BooleanField(),
                    "data": UserSerializer(),
                },
            ),
            400: {"description": "Validation error"},
        },
        tags=["Auth"],
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return self.error("Invalid data", errors=serializer.errors)
        user = serializer.save()
        return self.success(UserSerializer(user).data, status.HTTP_201_CREATED)


class LoginView(BaseAPIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    serializer_class = LoginSerializer

    @extend_schema(
        summary="Login",
        description="Authenticate user and return JWT tokens.",
        request=LoginSerializer,
        responses={
            200: inline_serializer(
                name="LoginResponse",
                fields={
                    "success": serializers.BooleanField(),
                    "data": LoginResponseSerializer(),
                },
            ),
            400: {"description": "Invalid credentials"},
        },
        tags=["Auth"],
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return self.error("Invalid credentials", errors=serializer.errors)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        tokens = {"access": str(refresh.access_token), "refresh": str(refresh)}
        return self.success({"tokens": tokens, "user": UserSerializer(user).data})


class MeView(BaseAPIView):
    serializer_class = UserSerializer

    @extend_schema(
        summary="Current user",
        description="Get current authenticated user profile.",
        responses={
            200: inline_serializer(
                name="MeResponse",
                fields={
                    "success": serializers.BooleanField(),
                    "data": UserSerializer(),
                },
            )
        },
        tags=["Auth"],
    )
    def get(self, request):
        return self.success(UserSerializer(request.user).data)


@extend_schema(
    summary="Refresh JWT",
    description="Exchange a refresh token for a new access token.",
    request=RefreshTokenSerializer,
    responses={
        200: inline_serializer(
            name="RefreshResponse",
            fields={
                "success": serializers.BooleanField(),
                "data": inline_serializer(
                    name="RefreshData",
                    fields={"tokens": TokenPairSerializer()},
                ),
            },
        ),
        400: {"description": "Missing refresh token"},
        401: {"description": "Invalid refresh token"},
    },
    tags=["Auth"],
)
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


@extend_schema(
    summary="Get CSRF token",
    description="Sets CSRF cookie for session based auth.",
    responses={
        200: inline_serializer(
            name="CsrfResponse",
            fields={
                "success": serializers.BooleanField(),
                "data": CsrfSerializer(),
            },
        )
    },
    tags=["Auth"],
)
@api_view(["GET"])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def csrf_token(_request):
    """Set CSRF cookie"""
    return BaseAPIView().success({"csrf": "set"})
