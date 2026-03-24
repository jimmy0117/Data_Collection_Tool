from django.contrib.auth import get_user_model, authenticate
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
)

def get_or_create_user(request=None):
	User = get_user_model()
	if request and hasattr(request, 'user') and request.user and request.user.is_authenticated:
		user = request.user
	else:
		raise PermissionDenied('需要登入才能存取資料')
	profile, _ = UserProfile.objects.get_or_create(user=user)
	return user, profile


class ConsentSignatureView(APIView):
	permission_classes = [IsAuthenticated]
	parser_classes = [MultiPartParser, FormParser]

	def get(self, request):
		user, _profile = get_or_create_user(request)
		qs = ConsentSignature.objects.filter(user=user).order_by('-created_at')[:50]
		serializer = ConsentSignatureSerializer(qs, many=True, context={'request': request})
		return Response(serializer.data)

	def post(self, request):
		user, _profile = get_or_create_user(request)
		serializer = ConsentSignatureSerializer(data=request.data, context={'request': request})
		if serializer.is_valid():
			signature = serializer.save(user=user)
			# Optionally attach a detection log placeholder
			SignatureCheckLog.objects.create(signature=signature, status='uploaded', notes='Awaiting detection')
			return Response(serializer.data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ConsentSignatureDetailView(APIView):
	permission_classes = [IsAuthenticated]
	def delete(self, request, signature_id):
		user, _profile = get_or_create_user(request)
		try:
			sig = ConsentSignature.objects.get(id=signature_id, user=user)
		except ConsentSignature.DoesNotExist:
			return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
		sig.delete()
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
		user, _profile = get_or_create_user(request)
		serializer = QuestionnaireSubmissionSerializer(data=request.data)
		if serializer.is_valid():
			serializer.save(user=user)
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
		return Response(status=status.HTTP_204_NO_CONTENT)


class ProfileView(APIView):
	permission_classes = [IsAuthenticated]
	parser_classes = [JSONParser]

	def get(self, request):
		user, profile = get_or_create_user(request)
		serializer = UserProfileSerializer(profile)
		return Response(serializer.data)

	def put(self, request):
		user, profile = get_or_create_user(request)
		payload = request.data.copy()
		payload['user'] = {
			'id': user.id,
			'username': user.username,
			'email': request.data.get('email', user.email),
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
		user, _profile = get_or_create_user(request)
		serializer = RecordingClipSerializer(data=request.data)
		if serializer.is_valid():
			serializer.save(user=user)
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
		user, _profile = get_or_create_user(request)
		serializer = RecordingSessionSerializer(data=request.data)
		if serializer.is_valid():
			serializer.save(user=user)
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
		return Response(status=status.HTTP_204_NO_CONTENT)


class LoginView(APIView):
	parser_classes = [JSONParser]

	def post(self, request):
		data = request.data or {}
		username_or_email = data.get('username') or data.get('email')
		password = data.get('password')
		if not username_or_email or not password:
			return Response({'detail': '缺少帳號或密碼'}, status=status.HTTP_400_BAD_REQUEST)

		User = get_user_model()
		username = username_or_email
		# allow login by email
		email_match = User.objects.filter(email=username_or_email).first()
		if email_match:
			username = email_match.username

		user = authenticate(request, username=username, password=password)
		if not user:
			return Response({'detail': '帳號或密碼錯誤'}, status=status.HTTP_400_BAD_REQUEST)

		token, _ = Token.objects.get_or_create(user=user)
		profile, _ = UserProfile.objects.get_or_create(user=user)
		return Response({
			'token': token.key,
			'user': {
				'name': user.first_name or user.username,
				'username': user.username,
				'email': user.email,
				'role': profile.role,
			},
		})
