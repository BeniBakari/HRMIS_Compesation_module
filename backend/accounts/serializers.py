from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    initials  = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id', 'email', 'force_number',
            'first_name', 'middle_name', 'last_name',
            'full_name', 'initials',
            'rank', 'role', 'unit', 'station', 'phone',
            'is_active', 'date_joined',
            'check_number', 'nin',
            'profile_photo', 'signature',
        ]
        read_only_fields = ['id', 'date_joined']
        # profile_photo and signature can be large; exclude them from list
        # responses by using UserListSerializer instead (see below).

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_initials(self, obj):
        return obj.get_initials()

    # ── Write: strip data-URI prefix if client sends a full URI ──────────────

    def validate_profile_photo(self, value: str) -> str:
        """Accept either raw base64 or a data-URI; always store raw base64."""
        if value and value.startswith('data:'):
            try:
                value = value.split(',', 1)[1]
            except IndexError:
                raise serializers.ValidationError(
                    'Invalid data-URI format for profile_photo.'
                )
        return value

    def validate_signature(self, value: str) -> str:
        """Accept either raw base64 or a data-URI; always store raw base64."""
        if value and value.startswith('data:'):
            try:
                value = value.split(',', 1)[1]
            except IndexError:
                raise serializers.ValidationError(
                    'Invalid data-URI format for signature.'
                )
        return value


class UserListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list endpoints.
    Omits profile_photo and signature to keep responses small.
    """
    full_name = serializers.SerializerMethodField()
    initials  = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id', 'email', 'force_number',
            'first_name', 'middle_name', 'last_name',
            'full_name', 'initials',
            'rank', 'role', 'unit', 'station', 'phone',
            'is_active', 'date_joined',
        ]
        read_only_fields = ['id', 'date_joined']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_initials(self, obj):
        return obj.get_initials()


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['email'], password=data['password'])
        if not user:
            # Single message — don't reveal whether email or password is wrong.
            raise serializers.ValidationError('Invalid credentials.')
        if not user.is_active:
            raise serializers.ValidationError('This account has been deactivated.')
        data['user'] = user
        return data


class UserCreateSerializer(serializers.ModelSerializer):
    password         = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model  = User
        fields = [
            'email', 'force_number',
            'first_name', 'middle_name', 'last_name',
            'rank', 'role', 'unit', 'station', 'phone',
            'check_number', 'nin',
            'password', 'confirm_password',
            'profile_photo', 'signature'
        ]

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError(
                {'confirm_password': 'Passwords do not match.'}
            )
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ChangePasswordSerializer(serializers.Serializer):
    """Authenticated password change (requires current password)."""
    current_password = serializers.CharField(write_only=True)
    new_password     = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError(
                {'confirm_password': 'Passwords do not match.'}
            )
        return data

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        return user