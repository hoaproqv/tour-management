from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes, force_str
from django.utils.html import strip_tags
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, permissions, serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Role, Tenant
from accounts.serializers import (
    ChangePasswordSerializer,
    CheckPasswordSerializer,
    CsrfSerializer,
    ForgotPasswordSerializer,
    LoginResponseSerializer,
    LoginSerializer,
    RefreshTokenSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    RoleSerializer,
    TenantSerializer,
    TokenPairSerializer,
    UserCreateSerializer,
    UserMeUpdateSerializer,
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
            return self.error("Dữ liệu không hợp lệ", errors=serializer.errors)
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
        qs = Role.objects.exclude(name__in=["admin", "Manager"]).order_by("name")
        user = self.request.user
        role_name = (getattr(getattr(user, "role", None), "name", "") or "").lower()
        if not (user.is_superuser or user.is_staff or role_name == "admin"):
            qs = qs.exclude(name="company_manager")
        return qs

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
        base_qs = User.objects.select_related("tenant", "role").exclude(
            role__name__in=["admin", "Manager"]
        ).exclude(is_superuser=True)

        role_name = (getattr(getattr(user, "role", None), "name", "") or "").lower()
        if not self._is_admin(user):
            if getattr(user, "tenant_id", None):
                base_qs = base_qs.filter(tenant_id=user.tenant_id)
                if role_name == "company_manager":
                    base_qs = base_qs.exclude(role__name="company_manager")
            else:
                return User.objects.none()

        role_param = self.request.query_params.get("role")
        if role_param:
            base_qs = base_qs.filter(role__id=role_param)

        tenant_param = self.request.query_params.get("tenant")
        if tenant_param:
            base_qs = base_qs.filter(tenant_id=tenant_param)

        search_param = self.request.query_params.get("search")
        if search_param:
            from django.db.models import Q
            base_qs = base_qs.filter(
                Q(name__icontains=search_param)
                | Q(username__icontains=search_param)
                | Q(email__icontains=search_param)
                | Q(phone__icontains=search_param)
            )

        return base_qs

    def perform_create(self, serializer):
        user = self.request.user
        role_name = (getattr(getattr(user, "role", None), "name", "") or "").lower()

        if not self._is_admin(user) and role_name != "company_manager":
            raise PermissionDenied("Only admin or company managers can create users.")

        if role_name == "company_manager":
            serializer.validated_data['tenant'] = user.tenant
            target_role = serializer.validated_data.get('role')
            if target_role and target_role.name in ["admin", "company_manager", "Manager"]:
                raise PermissionDenied("Company managers cannot create admins or company managers.")

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

        role_name = (getattr(getattr(user, "role", None), "name", "") or "").lower()
        if role_name == "company_manager" and getattr(user, "tenant_id", None):
            return qs.filter(tenant_id=user.tenant_id).exclude(role__name="company_manager")

        return User.objects.none()

    def perform_update(self, serializer):
        user = self.request.user
        role_name = (getattr(getattr(user, "role", None), "name", "") or "").lower()

        if not self._is_admin(user) and role_name != "company_manager":
            raise PermissionDenied("Only admin or company managers can update users.")

        if role_name == "company_manager":
            serializer.validated_data['tenant'] = user.tenant
            target_role = serializer.validated_data.get('role')
            if target_role and target_role.name in ["admin", "company_manager", "Manager"]:
                raise PermissionDenied("Company managers cannot assign admin or company manager roles.")

        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        role_name = (getattr(getattr(user, "role", None), "name", "") or "").lower()

        if not self._is_admin(user) and role_name != "company_manager":
            raise PermissionDenied("Only admin or company managers can delete users.")

        if role_name == "company_manager":
            target_role_name = (getattr(getattr(instance, "role", None), "name", "") or "").lower()
            if target_role_name in ["admin", "company_manager", "manager"]:
                raise PermissionDenied("Company managers cannot delete admins or company managers.")

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
            400: {"description": "Tên đăng nhập hoặc mật khẩu không chính xác"},
        },
        tags=["Auth"],
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return self.error("Tên đăng nhập hoặc mật khẩu không chính xác", errors=serializer.errors)
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
        summary="Update current user",
        description="Update profile of current user (name, email, phone).",
        request=UserMeUpdateSerializer,
        responses={
            200: inline_serializer(
                name="MeUpdateResponse",
                fields={
                    "success": serializers.BooleanField(),
                    "data": UserSerializer(),
                },
            ),
            400: {"description": "Validation error"},
        },
        tags=["Auth"],
    )
    def put(self, request):
        serializer = UserMeUpdateSerializer(request.user, data=request.data, partial=True)
        if not serializer.is_valid():
            return self.error("Dữ liệu không hợp lệ", errors=serializer.errors)
        serializer.save()
        return self.success(UserSerializer(request.user).data)

    def patch(self, request):
        return self.put(request)


class ChangePasswordView(BaseAPIView):
    serializer_class = ChangePasswordSerializer

    @extend_schema(
        summary="Change Password",
        description="Change current user's password.",
        request=ChangePasswordSerializer,
        responses={
            200: inline_serializer(
                name="ChangePasswordResponse",
                fields={
                    "success": serializers.BooleanField(),
                    "data": serializers.CharField(),
                },
            ),
            400: {"description": "Mật khẩu cũ không chính xác hoặc dữ liệu không hợp lệ"},
        },
        tags=["Auth"],
    )
    def put(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return self.error("Dữ liệu không hợp lệ", errors=serializer.errors)

        user = request.user
        if not user.check_password(serializer.validated_data["current_password"]):
            return self.error("Mật khẩu hiện tại không chính xác")

        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return self.success("Đổi mật khẩu thành công")


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
        400: {"description": "Thiếu mã làm mới (refresh token)"},
        401: {"description": "Mã làm mới (refresh token) không hợp lệ"},
    },
    tags=["Auth"],
)
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def refresh_token(request):
    """Refresh JWT token"""
    refresh_token_value = request.data.get("refresh")
    if not refresh_token_value:
        return BaseAPIView().error("Thiếu mã làm mới (refresh token)")
    try:
        refresh = RefreshToken(refresh_token_value)
        data = {"access": str(refresh.access_token), "refresh": str(refresh)}
        return BaseAPIView().success({"tokens": data})
    except Exception:
        return BaseAPIView().error(
            "Mã làm mới (refresh token) không hợp lệ", status_code=status.HTTP_401_UNAUTHORIZED
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


class UserBulkDeleteView(UserListCreateView):
    @extend_schema(
        summary="Bulk delete users",
        description="Delete multiple users by ID.",
        request=inline_serializer("UserBulkDelete", fields={"ids": serializers.ListField(child=serializers.IntegerField())}),
        responses={
            200: inline_serializer(
                "UserBulkDeleteResponse",
                fields={
                    "success": serializers.BooleanField(),
                    "data": inline_serializer("UserBulkDeleteData", fields={"deleted": serializers.IntegerField()})
                }
            )
        },
        tags=["Users"],
    )
    def post(self, request, *args, **kwargs):
        user = request.user
        role_name = (getattr(getattr(user, "role", None), "name", "") or "").lower()
        if not self._is_admin(user) and role_name != "company_manager":
            raise PermissionDenied("Only admin or company managers can delete users.")

        ids = request.data.get("ids", [])
        if not ids:
            return BaseAPIView().error("No ids provided")

        qs = self.get_queryset().filter(id__in=ids)
        if role_name == "company_manager":
            qs = qs.exclude(role__name__in=["admin", "company_manager", "Manager"])

        deleted, _ = qs.delete()
        return BaseAPIView().success({"deleted": deleted})


class TenantBulkDeleteView(TenantListCreateView):
    @extend_schema(
        summary="Bulk delete tenants",
        description="Delete multiple tenants by ID.",
        request=inline_serializer("TenantBulkDelete", fields={"ids": serializers.ListField(child=serializers.IntegerField())}),
        responses={
            200: inline_serializer(
                "TenantBulkDeleteResponse",
                fields={
                    "success": serializers.BooleanField(),
                    "data": inline_serializer("TenantBulkDeleteData", fields={"deleted": serializers.IntegerField()})
                }
            )
        },
        tags=["Tenants"],
    )
    def post(self, request, *args, **kwargs):
        ids = request.data.get("ids", [])
        if not ids:
            return BaseAPIView().error("No ids provided")
        qs = self.get_queryset().filter(id__in=ids)
        deleted, _ = qs.delete()
        return BaseAPIView().success({"deleted": deleted})


class CheckPasswordView(BaseAPIView):
    serializer_class = CheckPasswordSerializer

    @extend_schema(
        summary="Check Password",
        description="Verify current user's password.",
        request=CheckPasswordSerializer,
        responses={
            200: inline_serializer(
                name="CheckPasswordResponse",
                fields={
                    "success": serializers.BooleanField(),
                    "data": serializers.BooleanField(),
                },
            ),
            400: {"description": "Mật khẩu hiện tại không chính xác"},
        },
        tags=["Auth"],
    )
    def post(self, request):
        serializer = CheckPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return self.error("Dữ liệu không hợp lệ")

        user = request.user
        if not user.check_password(serializer.validated_data["current_password"]):
            return self.error("Mật khẩu hiện tại không chính xác")

        return self.success(True)


class ForgotPasswordView(BaseAPIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    serializer_class = ForgotPasswordSerializer

    @extend_schema(
        summary="Forgot Password",
        description="Send password reset email to user.",
        request=ForgotPasswordSerializer,
        responses={200: inline_serializer("ForgotResponse", fields={"success": serializers.BooleanField(), "data": serializers.CharField()})},
        tags=["Auth"],
    )
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return self.error("Email không hợp lệ")

        email = serializer.validated_data["email"]
        user = User.objects.filter(email=email).first()
        if user:
            token = default_token_generator.make_token(user)
            uidb64 = urlsafe_base64_encode(force_bytes(user.pk))

            # Using port 3000 assuming frontend is running there, could be driven by .env later
            reset_url = f"http://localhost:3000/view/reset-password?uidb64={uidb64}&token={token}"

            subject = "Yêu cầu khôi phục mật khẩu - Hệ thống Quản lý Chuyến đi"

            context = {
                'user_name': user.name or user.username,
                'reset_url': reset_url,
            }
            html_message = render_to_string('accounts/email/reset_password.html', context)
            plain_message = strip_tags(html_message)

            try:
                send_mail(
                    subject,
                    plain_message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    html_message=html_message,
                    fail_silently=False,
                )
            except Exception as e:
                return self.error(f"Lỗi gửi email: {str(e)}")

        # Luôn trả về thành công dù có email hay không (bảo mật không lộ user)
        return self.success("Đường link khôi phục mật khẩu đã được gửi vào email của bạn.")


class ResetPasswordView(BaseAPIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    serializer_class = ResetPasswordSerializer

    @extend_schema(
        summary="Reset Password",
        description="Reset user password using token and uidb64.",
        request=ResetPasswordSerializer,
        responses={200: inline_serializer("ResetResponse", fields={"success": serializers.BooleanField(), "data": serializers.CharField()})},
        tags=["Auth"],
    )
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return self.error("Dữ liệu không hợp lệ")

        uidb64 = serializer.validated_data["uidb64"]
        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, token):
            user.set_password(new_password)
            user.save()
            return self.success("Khôi phục mật khẩu thành công")
        else:
            return self.error("Đường dẫn không hợp lệ hoặc đã hết hạn")
