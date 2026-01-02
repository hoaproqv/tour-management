from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["username", "email", "name", "password"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


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
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "name",
            "tenant",
            "role",
            "is_active",
            "is_staff",
        ]


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
