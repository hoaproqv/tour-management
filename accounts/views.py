from django.contrib.auth import get_user_model
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, permissions, serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Tenant
from accounts.serializers import (
    CsrfSerializer,
    LoginResponseSerializer,
    LoginSerializer,
    RefreshTokenSerializer,
    RegisterSerializer,
    TenantSerializer,
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


class TenantListCreateView(generics.ListCreateAPIView):
    serializer_class = TenantSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, "tenant_id", None):
            return Tenant.objects.filter(id=user.tenant_id)
        return Tenant.objects.all()

    @extend_schema(
        summary="List tenants",
        description="List tenants. If the user belongs to a tenant, only that tenant is returned.",
        responses={200: TenantSerializer},
        tags=["Tenants"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Create tenant",
        description="Create a new tenant",
        request=TenantSerializer,
        responses={201: TenantSerializer, 400: {"description": "Validation error"}},
        tags=["Tenants"],
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)

    def perform_create(self, serializer):
        user = self.request.user
        if getattr(user, "tenant_id", None):
            raise ValidationError("You cannot create a tenant while assigned to one.")
        serializer.save()


class TenantDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TenantSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, "tenant_id", None):
            return Tenant.objects.filter(id=user.tenant_id)
        return Tenant.objects.all()

    @extend_schema(
        summary="Retrieve tenant",
        description="Get tenant by ID (scoped to user's tenant if assigned).",
        responses={200: TenantSerializer, 404: {"description": "Not found"}},
        tags=["Tenants"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Update tenant",
        description="Update tenant information.",
        request=TenantSerializer,
        responses={200: TenantSerializer, 400: {"description": "Validation error"}},
        tags=["Tenants"],
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @extend_schema(
        summary="Partial update tenant",
        description="Partially update tenant information.",
        request=TenantSerializer,
        responses={200: TenantSerializer, 400: {"description": "Validation error"}},
        tags=["Tenants"],
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    @extend_schema(
        summary="Delete tenant",
        description="Delete tenant by ID.",
        responses={204: None, 404: {"description": "Not found"}},
        tags=["Tenants"],
    )
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)


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
