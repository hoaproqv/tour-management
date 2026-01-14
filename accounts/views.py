from django.contrib.auth import get_user_model
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, permissions, serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Role, Tenant
from accounts.serializers import (
    CsrfSerializer,
    LoginResponseSerializer,
    LoginSerializer,
    RefreshTokenSerializer,
    RegisterSerializer,
    RoleSerializer,
    TenantSerializer,
    TokenPairSerializer,
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
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


class RoleListView(generics.ListAPIView):
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Role.objects.all().order_by("name")

    @extend_schema(
        summary="List roles",
        description="List available roles in the system.",
        responses={200: RoleSerializer(many=True)},
        tags=["Roles"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class UserListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UserCreateSerializer
        return UserSerializer

    def _is_admin(self, user):
        role_name = (getattr(getattr(user, "role", None), "name", "") or "").lower()
        return user.is_superuser or user.is_staff or role_name == "admin"

    def get_queryset(self):
        user = self.request.user
        base_qs = User.objects.select_related("tenant", "role").all()
        if not self._is_admin(user):
            if getattr(user, "tenant_id", None):
                base_qs = base_qs.filter(tenant_id=user.tenant_id)
            else:
                return User.objects.none()

        role_param = self.request.query_params.get("role")
        if role_param:
            base_qs = base_qs.filter(role__name__iexact=role_param)

        tenant_param = self.request.query_params.get("tenant")
        if tenant_param:
            base_qs = base_qs.filter(tenant_id=tenant_param)

        return base_qs

    def perform_create(self, serializer):
        if not self._is_admin(self.request.user):
            raise PermissionDenied("Only admin accounts can create users.")
        serializer.save()

    @extend_schema(
        summary="List users",
        description="List users scoped to the current tenant unless admin.",
        responses={200: UserSerializer(many=True)},
        tags=["Users"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Create user",
        description="Create a new user (admin only).",
        request=UserCreateSerializer,
        responses={201: UserSerializer},
        tags=["Users"],
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return UserUpdateSerializer
        return UserSerializer

    def _is_admin(self, user):
        role_name = (getattr(getattr(user, "role", None), "name", "") or "").lower()
        return user.is_superuser or user.is_staff or role_name == "admin"

    def get_queryset(self):
        user = self.request.user
        qs = User.objects.select_related("tenant", "role").all()
        if self._is_admin(user):
            return qs
        return User.objects.none()

    def perform_update(self, serializer):
        if not self._is_admin(self.request.user):
            raise PermissionDenied("Only admin accounts can update users.")
        serializer.save()

    def perform_destroy(self, instance):
        if not self._is_admin(self.request.user):
            raise PermissionDenied("Only admin accounts can delete users.")
        instance.delete()


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
