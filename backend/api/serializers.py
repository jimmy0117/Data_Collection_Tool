from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import ConsentSignature, QuestionnaireSubmission, SignatureCheckLog, UserProfile, RecordingClip, RecordingSession


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ['id', 'username', 'first_name', 'last_name']
        read_only_fields = ['id', 'username']


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer()

    class Meta:
        model = UserProfile
        fields = ['user', 'phone', 'role', 'subject_status']

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        validated_data.pop('role', None)
        user = instance.user
        user.first_name = user_data.get('first_name', user.first_name)
        user.last_name = user_data.get('last_name', user.last_name)
        user.save()
        return super().update(instance, validated_data)

    def create(self, validated_data):
        user_data = validated_data.pop('user')
        User = get_user_model()
        user, _ = User.objects.get_or_create(
            username=user_data.get('username', user_data.get('email') or 'user'),
            defaults={
                'email': user_data.get('email', ''),
                'first_name': user_data.get('first_name', ''),
                'last_name': user_data.get('last_name', ''),
            },
        )
        return UserProfile.objects.create(user=user, **validated_data)


class ConsentSignatureSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = ConsentSignature
        fields = [
            'id',
            'user',
            'created_by',
            'created_by_username',
            'signer_name',
            'signer_email',
            'doc_label',
            'signature_file',
            'detection_status',
            'detection_notes',
            'checked_at',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'checked_at', 'user', 'created_by', 'created_by_username', 'detection_status', 'detection_notes']


class SignatureCheckLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SignatureCheckLog
        fields = ['id', 'signature', 'status', 'score', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']


class QuestionnaireSubmissionSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = QuestionnaireSubmission
        fields = ['id', 'user', 'created_by', 'created_by_username', 'questionnaire_id', 'answers', 'submitted_at']
        read_only_fields = ['id', 'submitted_at', 'user', 'created_by', 'created_by_username']


class RecordingClipSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = RecordingClip
        fields = ['id', 'user', 'created_by', 'created_by_username', 'session_id', 'prompt', 'phase', 'audio_file', 'created_at']
        read_only_fields = ['id', 'created_at', 'user', 'created_by', 'created_by_username']


class RecordingSessionSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = RecordingSession
        fields = ['id', 'user', 'created_by', 'created_by_username', 'session_id', 'clip_count', 'created_at']
        read_only_fields = ['id', 'created_at', 'user', 'created_by', 'created_by_username']


class RespondentListSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    subject_status = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = ['id', 'username', 'name', 'role', 'subject_status', 'date_joined']

    def get_name(self, obj):
        return obj.first_name or obj.username

    def get_role(self, obj):
        profile = getattr(obj, 'profile', None)
        return getattr(profile, 'role', UserProfile.ROLE_RESPONDENT)

    def get_subject_status(self, obj):
        profile = getattr(obj, 'profile', None)
        return getattr(profile, 'subject_status', UserProfile.STATUS_TEST)


class RespondentCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=128, min_length=6, write_only=True)
    name = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_username(self, value):
        User = get_user_model()
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('使用者名稱已存在')
        return value
