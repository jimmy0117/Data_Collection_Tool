from django.contrib.auth import get_user_model, authenticate
from django.db.models import Q
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from .models import ConsentSignature, QuestionnaireSubmission, SignatureCheckLog, UserProfile, RecordingClip, RecordingSession
from .serializers import (
	ConsentSignatureSerializer,
	QuestionnaireSubmissionSerializer,
	SignatureCheckLogSerializer,
	UserProfileSerializer,
	RecordingClipSerializer,
	RecordingSessionSerializer,
	RespondentListSerializer,
	RespondentCreateSerializer,
)


REQUIRED_CONSENT_COUNT = 2

def get_or_create_user(request=None):
	User = get_user_model()
	if request and hasattr(request, 'user') and request.user and request.user.is_authenticated:
		user = request.user
	else:
		raise PermissionDenied('需要登入才能存取資料')
	profile, _ = UserProfile.objects.get_or_create(user=user)
	return user, profile


def is_admin_user(user):
	if not user:
		return False
	if getattr(user, 'is_superuser', False):
		return True
	profile, _ = UserProfile.objects.get_or_create(user=user)
	return profile.role == UserProfile.ROLE_ADMIN


def ensure_admin(user):
	if not is_admin_user(user):
		raise PermissionDenied('需要管理員權限')


def refresh_subject_status(user):
	if not user:
		return None
	profile, _ = UserProfile.objects.get_or_create(user=user)
	consent_count = ConsentSignature.objects.filter(user=user).count()
	questionnaire_count = QuestionnaireSubmission.objects.filter(user=user).count()
	recording_count = RecordingSession.objects.filter(user=user).count()
	is_done_ready = consent_count >= REQUIRED_CONSENT_COUNT and questionnaire_count >= 1 and recording_count >= 1
	if not is_done_ready:
		status_value = UserProfile.STATUS_TEST
	elif profile.subject_status == UserProfile.STATUS_CHECKED:
		status_value = UserProfile.STATUS_CHECKED
	else:
		status_value = UserProfile.STATUS_DONE
	if profile.subject_status != status_value:
		profile.subject_status = status_value
		profile.save(update_fields=['subject_status'])
	return profile


def resolve_target_user(request, actor):
	target_user_id = request.data.get('target_user_id') if hasattr(request, 'data') else None
	if not target_user_id:
		return actor
	if not is_admin_user(actor):
		raise PermissionDenied('僅管理員可代受測者操作')
	User = get_user_model()
	try:
		target_user = User.objects.get(id=target_user_id)
	except User.DoesNotExist:
		raise PermissionDenied('指定受測者不存在')
	target_profile, _ = UserProfile.objects.get_or_create(user=target_user)
	if not target_profile.role:
		target_profile.role = UserProfile.ROLE_RESPONDENT
		target_profile.save(update_fields=['role'])
	if target_profile.role != UserProfile.ROLE_RESPONDENT and not target_user.is_superuser:
		raise PermissionDenied('只能選擇受測者帳號')
	return target_user


def resolve_target_user_from_query(request, actor):
	target_user_id = request.query_params.get('target_user_id')
	if not target_user_id:
		return actor
	if not is_admin_user(actor):
		raise PermissionDenied('僅管理員可代受測者操作')
	User = get_user_model()
	try:
		target_user = User.objects.get(id=target_user_id)
	except User.DoesNotExist:
		raise PermissionDenied('指定受測者不存在')
	target_profile, _ = UserProfile.objects.get_or_create(user=target_user)
	if not target_profile.role:
		target_profile.role = UserProfile.ROLE_RESPONDENT
		target_profile.save(update_fields=['role'])
	if target_profile.role != UserProfile.ROLE_RESPONDENT and not target_user.is_superuser:
		raise PermissionDenied('只能選擇受測者帳號')
	return target_user


class ConsentSignatureView(APIView):
	permission_classes = [IsAuthenticated]
	parser_classes = [MultiPartParser, FormParser]

	def get(self, request):
		actor, _profile = get_or_create_user(request)
		target_user = resolve_target_user_from_query(request, actor)
		qs = ConsentSignature.objects.filter(user=target_user).order_by('-created_at')[:50]
		serializer = ConsentSignatureSerializer(qs, many=True, context={'request': request})
		return Response(serializer.data)

	def post(self, request):
		actor, _profile = get_or_create_user(request)
		target_user = resolve_target_user(request, actor)
		serializer = ConsentSignatureSerializer(data=request.data, context={'request': request})
		if serializer.is_valid():
			signature = serializer.save(user=target_user, created_by=actor)
			# Optionally attach a detection log placeholder
			SignatureCheckLog.objects.create(signature=signature, status='uploaded', notes='Awaiting detection')
			refresh_subject_status(target_user)
			return Response(serializer.data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ConsentSignatureDetailView(APIView):
	permission_classes = [IsAuthenticated]
	def delete(self, request, signature_id):
		actor, _profile = get_or_create_user(request)
		target_user = resolve_target_user_from_query(request, actor)
		try:
			sig = ConsentSignature.objects.get(id=signature_id, user=target_user)
		except ConsentSignature.DoesNotExist:
			return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
		sig.delete()
		refresh_subject_status(target_user)
		return Response(status=status.HTTP_204_NO_CONTENT)


class SignatureCheckLogView(APIView):
	permission_classes = [IsAuthenticated]
	parser_classes = [JSONParser]

	def post(self, request, signature_id):
		user, _profile = get_or_create_user(request)
		try:
			signature = ConsentSignature.objects.get(id=signature_id, user=user)
		except ConsentSignature.DoesNotExist:
			return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
		data = {**request.data, 'signature': signature_id}
		serializer = SignatureCheckLogSerializer(data=data)
		if serializer.is_valid():
			log = serializer.save(signature=signature)
			# Update signature detection fields for quick lookup
			sig = log.signature
			sig.detection_status = log.status
			sig.detection_notes = log.notes
			sig.checked_at = log.created_at
			sig.save(update_fields=['detection_status', 'detection_notes', 'checked_at'])
			return Response(serializer.data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class QuestionnaireSubmissionView(APIView):
	permission_classes = [IsAuthenticated]
	parser_classes = [JSONParser]

	def get(self, request):
		user, _profile = get_or_create_user(request)
		submissions = QuestionnaireSubmission.objects.filter(user=user).order_by('-submitted_at')[:50]
		serializer = QuestionnaireSubmissionSerializer(submissions, many=True)
		return Response(serializer.data)

	def post(self, request):
		actor, _profile = get_or_create_user(request)
		target_user = resolve_target_user(request, actor)
		serializer = QuestionnaireSubmissionSerializer(data=request.data)
		if serializer.is_valid():
			serializer.save(user=target_user, created_by=actor)
			refresh_subject_status(target_user)
			return Response(serializer.data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class QuestionnaireSubmissionDetailView(APIView):
	permission_classes = [IsAuthenticated]
	def delete(self, request, submission_id):
		user, _profile = get_or_create_user(request)
		try:
			item = QuestionnaireSubmission.objects.get(id=submission_id, user=user)
		except QuestionnaireSubmission.DoesNotExist:
			return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
		item.delete()
		refresh_subject_status(user)
		return Response(status=status.HTTP_204_NO_CONTENT)


class ProfileView(APIView):
	permission_classes = [IsAuthenticated]
	parser_classes = [JSONParser]

	def get(self, request):
		user, profile = get_or_create_user(request)
		profile = refresh_subject_status(user) or profile
		serializer = UserProfileSerializer(profile)
		return Response(serializer.data)

	def put(self, request):
		user, profile = get_or_create_user(request)
		payload = request.data.copy()
		payload['user'] = {
			'id': user.id,
			'username': user.username,
			'email': user.email,
			'first_name': request.data.get('first_name', user.first_name),
			'last_name': request.data.get('last_name', user.last_name),
		}
		serializer = UserProfileSerializer(profile, data=payload)
		if serializer.is_valid():
			serializer.save()
			return Response(serializer.data)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RecordingClipView(APIView):
	permission_classes = [IsAuthenticated]
	parser_classes = [MultiPartParser, FormParser]

	def get(self, request):
		user, _profile = get_or_create_user(request)
		clips = RecordingClip.objects.filter(user=user).order_by('-created_at')[:100]
		serializer = RecordingClipSerializer(clips, many=True, context={'request': request})
		return Response(serializer.data)

	def post(self, request):
		actor, _profile = get_or_create_user(request)
		target_user = resolve_target_user(request, actor)
		serializer = RecordingClipSerializer(data=request.data)
		if serializer.is_valid():
			serializer.save(user=target_user, created_by=actor)
			return Response(serializer.data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RecordingSessionView(APIView):
	permission_classes = [IsAuthenticated]
	parser_classes = [JSONParser]

	def get(self, request):
		user, _profile = get_or_create_user(request)
		sessions = RecordingSession.objects.filter(user=user).order_by('-created_at')[:100]
		serializer = RecordingSessionSerializer(sessions, many=True)
		return Response(serializer.data)

	def post(self, request):
		actor, _profile = get_or_create_user(request)
		target_user = resolve_target_user(request, actor)
		serializer = RecordingSessionSerializer(data=request.data)
		if serializer.is_valid():
			serializer.save(user=target_user, created_by=actor)
			refresh_subject_status(target_user)
			return Response(serializer.data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RecordingSessionDetailView(APIView):
	permission_classes = [IsAuthenticated]
	def delete(self, request, session_id):
		user, _profile = get_or_create_user(request)
		try:
			session = RecordingSession.objects.get(id=session_id, user=user)
		except RecordingSession.DoesNotExist:
			return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

		# delete associated clips sharing the session_id string
		RecordingClip.objects.filter(session_id=session.session_id, user=user).delete()
		session.delete()
		refresh_subject_status(user)
		return Response(status=status.HTTP_204_NO_CONTENT)


class RespondentManagementView(APIView):
	permission_classes = [IsAuthenticated]
	parser_classes = [JSONParser]

	def get(self, request):
		actor, _profile = get_or_create_user(request)
		ensure_admin(actor)
		User = get_user_model()
		respondents = User.objects.filter(
			Q(profile__role=UserProfile.ROLE_RESPONDENT) | Q(profile__isnull=True)
		).exclude(is_superuser=True).order_by('-date_joined')
		serializer = RespondentListSerializer(respondents, many=True)
		return Response(serializer.data)

	def post(self, request):
		actor, _profile = get_or_create_user(request)
		ensure_admin(actor)
		serializer = RespondentCreateSerializer(data=request.data)
		if not serializer.is_valid():
			return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

		validated = serializer.validated_data
		User = get_user_model()
		user = User.objects.create_user(
			username=validated['username'],
			password=validated['password'],
			first_name=validated.get('name', '').strip(),
		)
		profile, _ = UserProfile.objects.get_or_create(user=user)
		profile.role = UserProfile.ROLE_RESPONDENT
		profile.save(update_fields=['role'])
		output = RespondentListSerializer(user)
		return Response(output.data, status=status.HTTP_201_CREATED)


class AdminSubjectRecordsView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request, user_id):
		actor, _profile = get_or_create_user(request)
		ensure_admin(actor)
		User = get_user_model()
		try:
			subject = User.objects.get(id=user_id)
		except User.DoesNotExist:
			return Response({'detail': '受測者不存在'}, status=status.HTTP_404_NOT_FOUND)

		questionnaires = QuestionnaireSubmission.objects.filter(user=subject).order_by('-submitted_at')[:100]
		recording_sessions = RecordingSession.objects.filter(user=subject).order_by('-created_at')[:100]
		signatures = ConsentSignature.objects.filter(user=subject).order_by('-created_at')[:50]

		return Response({
			'subject': {
				'id': subject.id,
				'username': subject.username,
				'name': subject.first_name or subject.username,
			},
			'questionnaires': QuestionnaireSubmissionSerializer(questionnaires, many=True).data,
			'recording_sessions': RecordingSessionSerializer(recording_sessions, many=True).data,
			'signatures': ConsentSignatureSerializer(signatures, many=True, context={'request': request}).data,
		})


class AdminSubjectQuestionnaireDetailView(APIView):
	permission_classes = [IsAuthenticated]

	def delete(self, request, user_id, submission_id):
		actor, _profile = get_or_create_user(request)
		ensure_admin(actor)
		User = get_user_model()
		try:
			subject = User.objects.get(id=user_id)
		except User.DoesNotExist:
			return Response({'detail': '受測者不存在'}, status=status.HTTP_404_NOT_FOUND)

		try:
			item = QuestionnaireSubmission.objects.get(id=submission_id, user=subject)
		except QuestionnaireSubmission.DoesNotExist:
			return Response({'detail': '紀錄不存在'}, status=status.HTTP_404_NOT_FOUND)

		item.delete()
		refresh_subject_status(subject)
		return Response(status=status.HTTP_204_NO_CONTENT)


class AdminSubjectRecordingSessionDetailView(APIView):
	permission_classes = [IsAuthenticated]

	def delete(self, request, user_id, session_id):
		actor, _profile = get_or_create_user(request)
		ensure_admin(actor)
		User = get_user_model()
		try:
			subject = User.objects.get(id=user_id)
		except User.DoesNotExist:
			return Response({'detail': '受測者不存在'}, status=status.HTTP_404_NOT_FOUND)

		try:
			session = RecordingSession.objects.get(id=session_id, user=subject)
		except RecordingSession.DoesNotExist:
			return Response({'detail': '紀錄不存在'}, status=status.HTTP_404_NOT_FOUND)

		RecordingClip.objects.filter(session_id=session.session_id, user=subject).delete()
		session.delete()
		refresh_subject_status(subject)
		return Response(status=status.HTTP_204_NO_CONTENT)


class AdminRespondentPasswordResetView(APIView):
	permission_classes = [IsAuthenticated]
	parser_classes = [JSONParser]

	def post(self, request, user_id):
		actor, _profile = get_or_create_user(request)
		ensure_admin(actor)

		password = str((request.data or {}).get('password', ''))

		User = get_user_model()
		try:
			subject = User.objects.get(id=user_id)
		except User.DoesNotExist:
			return Response({'detail': '受測者不存在'}, status=status.HTTP_404_NOT_FOUND)

		profile, _ = UserProfile.objects.get_or_create(user=subject)
		if profile.role and profile.role != UserProfile.ROLE_RESPONDENT:
			return Response({'detail': '僅能重設受測者密碼'}, status=status.HTTP_400_BAD_REQUEST)

		if not profile.role:
			profile.role = UserProfile.ROLE_RESPONDENT
			profile.save(update_fields=['role'])

		subject.set_password(password)
		subject.save(update_fields=['password'])
		return Response({'detail': f'已重設 {subject.username} 的密碼'})


class AdminRespondentMarkCheckedView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request, user_id):
		actor, _profile = get_or_create_user(request)
		ensure_admin(actor)

		User = get_user_model()
		try:
			subject = User.objects.get(id=user_id)
		except User.DoesNotExist:
			return Response({'detail': '受測者不存在'}, status=status.HTTP_404_NOT_FOUND)

		profile, _ = UserProfile.objects.get_or_create(user=subject)
		if not profile.role:
			profile.role = UserProfile.ROLE_RESPONDENT
			profile.save(update_fields=['role'])
		elif profile.role != UserProfile.ROLE_RESPONDENT:
			return Response({'detail': '僅能標記受測者'}, status=status.HTTP_400_BAD_REQUEST)

		refresh_subject_status(subject)
		profile.refresh_from_db(fields=['subject_status'])
		if profile.subject_status != UserProfile.STATUS_DONE:
			return Response({'detail': '僅 DONE 狀態可標記為 CHECKED'}, status=status.HTTP_400_BAD_REQUEST)

		profile.subject_status = UserProfile.STATUS_CHECKED
		profile.save(update_fields=['subject_status'])
		return Response({'detail': f'已將 {subject.username} 標記為 CHECKED'})


class AdminRespondentMarkDoneView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request, user_id):
		actor, _profile = get_or_create_user(request)
		ensure_admin(actor)

		User = get_user_model()
		try:
			subject = User.objects.get(id=user_id)
		except User.DoesNotExist:
			return Response({'detail': '受測者不存在'}, status=status.HTTP_404_NOT_FOUND)

		profile, _ = UserProfile.objects.get_or_create(user=subject)
		if not profile.role:
			profile.role = UserProfile.ROLE_RESPONDENT
			profile.save(update_fields=['role'])
		elif profile.role != UserProfile.ROLE_RESPONDENT:
			return Response({'detail': '僅能標記受測者'}, status=status.HTTP_400_BAD_REQUEST)

		refresh_subject_status(subject)
		profile.refresh_from_db(fields=['subject_status'])
		if profile.subject_status != UserProfile.STATUS_CHECKED:
			return Response({'detail': '僅 CHECKED 狀態可復原為 DONE'}, status=status.HTTP_400_BAD_REQUEST)

		profile.subject_status = UserProfile.STATUS_DONE
		profile.save(update_fields=['subject_status'])
		return Response({'detail': f'已將 {subject.username} 復原為 DONE'})


class LoginView(APIView):
	parser_classes = [JSONParser]

	def post(self, request):
		data = request.data or {}
		username = data.get('username')
		password = data.get('password')
		if not username or not password:
			return Response({'detail': '缺少帳號或密碼'}, status=status.HTTP_400_BAD_REQUEST)

		user = authenticate(request, username=username, password=password)
		if not user:
			return Response({'detail': '帳號或密碼錯誤'}, status=status.HTTP_400_BAD_REQUEST)

		token, _ = Token.objects.get_or_create(user=user)
		profile, _ = UserProfile.objects.get_or_create(user=user)
		role = profile.role or UserProfile.ROLE_RESPONDENT
		if user.is_superuser and role != UserProfile.ROLE_ADMIN:
			role = UserProfile.ROLE_ADMIN
			profile.role = UserProfile.ROLE_ADMIN
			profile.save(update_fields=['role'])
		return Response({
			'token': token.key,
			'user': {
				'name': user.first_name or user.username,
				'username': user.username,
				'role': role,
			},
		})
