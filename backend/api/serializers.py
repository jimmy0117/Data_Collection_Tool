from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import ConsentSignature, QuestionnaireSubmission, SignatureCheckLog, UserProfile, RecordingClip, RecordingSession


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id', 'username']


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer()

    class Meta:
        model = UserProfile
        fields = ['user', 'phone', 'role']

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        user = instance.user
        user.first_name = user_data.get('first_name', user.first_name)
        user.last_name = user_data.get('last_name', user.last_name)
        user.email = user_data.get('email', user.email)
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
    class Meta:
        model = ConsentSignature
        fields = [
            'id',
            'signer_name',
            'signer_email',
            'doc_label',
            'signature_file',
            'detection_status',
            'detection_notes',
            'checked_at',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'checked_at']


class SignatureCheckLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SignatureCheckLog
        fields = ['id', 'signature', 'status', 'score', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']


class QuestionnaireSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionnaireSubmission
        fields = ['id', 'user', 'questionnaire_id', 'answers', 'submitted_at']
        read_only_fields = ['id', 'submitted_at']


class RecordingClipSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecordingClip
        fields = ['id', 'user', 'session_id', 'prompt', 'phase', 'audio_file', 'created_at']
        read_only_fields = ['id', 'created_at', 'user']


class RecordingSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecordingSession
        fields = ['id', 'user', 'session_id', 'clip_count', 'created_at']
        read_only_fields = ['id', 'created_at', 'user']
