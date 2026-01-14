from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers

from accounts.models import Role, Tenant

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    tenant = serializers.PrimaryKeyRelatedField(
        queryset=Tenant.objects.all(), required=False, allow_null=True
    )
    role = serializers.PrimaryKeyRelatedField(
        queryset=Role.objects.all(), required=False, allow_null=True
    )
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "name",
            "phone",
            "password",
            "tenant",
            "role",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        try:
            return User.objects.create_user(password=password, **validated_data)
        except ValueError as exc:  # Guard against missing tenant for non-superuser
            raise serializers.ValidationError({"tenant": str(exc)}) from exc


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")
        user = authenticate(username=username, password=password)
        if not user:
            raise serializers.ValidationError("Invalid credentials")
        if not user.is_active:
            raise serializers.ValidationError("User is inactive")
        attrs["user"] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name", read_only=True)
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "name",
            "phone",
            "tenant",
            "tenant_name",
            "role",
            "role_name",
            "is_active",
            "is_staff",
            "is_superuser",
            "created_at",
            "updated_at",
        ]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "name",
            "phone",
            "password",
            "tenant",
            "role",
            "is_active",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        try:
            return User.objects.create_user(password=password, **validated_data)
        except ValueError as exc:
            raise serializers.ValidationError({"tenant": str(exc)}) from exc


class UserUpdateSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = [
            "email",
            "name",
            "phone",
            "tenant",
            "role",
            "is_active",
        ]


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["id", "name", "description"]


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ["id", "name", "description", "created_at", "updated_at"]


class TokenPairSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()


class LoginResponseSerializer(serializers.Serializer):
    tokens = TokenPairSerializer()
    user = UserSerializer()

    class Meta:
        # Avoid component name collision with inline serializer named "LoginResponse"
        ref_name = "LoginResponseData"


class RefreshTokenSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class CsrfSerializer(serializers.Serializer):
    csrf = serializers.CharField()
