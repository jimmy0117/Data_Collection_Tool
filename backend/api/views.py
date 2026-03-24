from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ConsentSignature, QuestionnaireSubmission, SignatureCheckLog, UserProfile, RecordingClip, RecordingSession
from .serializers import (
	ConsentSignatureSerializer,
	QuestionnaireSubmissionSerializer,
	SignatureCheckLogSerializer,
	UserProfileSerializer,
	RecordingClipSerializer,
	RecordingSessionSerializer,
)


def get_or_create_default_user():
	User = get_user_model()
	user, _ = User.objects.get_or_create(
		username='demo', defaults={'email': 'demo@example.com', 'first_name': 'Demo', 'last_name': 'User'}
	)
	profile, _ = UserProfile.objects.get_or_create(user=user)
	return user, profile


class ConsentSignatureView(APIView):
	parser_classes = [MultiPartParser, FormParser]

	def get(self, request):
		qs = ConsentSignature.objects.order_by('-created_at')[:50]
		serializer = ConsentSignatureSerializer(qs, many=True, context={'request': request})
		return Response(serializer.data)

	def post(self, request):
		serializer = ConsentSignatureSerializer(data=request.data, context={'request': request})
		if serializer.is_valid():
			signature = serializer.save()
			# Optionally attach a detection log placeholder
			SignatureCheckLog.objects.create(signature=signature, status='uploaded', notes='Awaiting detection')
			return Response(serializer.data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ConsentSignatureDetailView(APIView):
	def delete(self, request, signature_id):
		try:
			sig = ConsentSignature.objects.get(id=signature_id)
			sig.delete()
			return Response(status=status.HTTP_204_NO_CONTENT)
		except ConsentSignature.DoesNotExist:
			return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)


class SignatureCheckLogView(APIView):
	parser_classes = [JSONParser]

	def post(self, request, signature_id):
		data = {**request.data, 'signature': signature_id}
		serializer = SignatureCheckLogSerializer(data=data)
		if serializer.is_valid():
			log = serializer.save()
			# Update signature detection fields for quick lookup
			sig = log.signature
			sig.detection_status = log.status
			sig.detection_notes = log.notes
			sig.checked_at = log.created_at
			sig.save(update_fields=['detection_status', 'detection_notes', 'checked_at'])
			return Response(serializer.data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class QuestionnaireSubmissionView(APIView):
	parser_classes = [JSONParser]

	def get(self, request):
		submissions = QuestionnaireSubmission.objects.order_by('-submitted_at')[:50]
		serializer = QuestionnaireSubmissionSerializer(submissions, many=True)
		return Response(serializer.data)

	def post(self, request):
		user, _profile = get_or_create_default_user()
		payload = request.data.copy()
		payload['user'] = user.id
		serializer = QuestionnaireSubmissionSerializer(data=payload)
		if serializer.is_valid():
			serializer.save()
			return Response(serializer.data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class QuestionnaireSubmissionDetailView(APIView):
	def delete(self, request, submission_id):
		try:
			item = QuestionnaireSubmission.objects.get(id=submission_id)
			item.delete()
			return Response(status=status.HTTP_204_NO_CONTENT)
		except QuestionnaireSubmission.DoesNotExist:
			return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)


class ProfileView(APIView):
	parser_classes = [JSONParser]

	def get(self, request):
		user, profile = get_or_create_default_user()
		serializer = UserProfileSerializer(profile)
		return Response(serializer.data)

	def put(self, request):
		user, profile = get_or_create_default_user()
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
	parser_classes = [MultiPartParser, FormParser]

	def get(self, request):
		clips = RecordingClip.objects.order_by('-created_at')[:100]
		serializer = RecordingClipSerializer(clips, many=True, context={'request': request})
		return Response(serializer.data)

	def post(self, request):
		user, _profile = get_or_create_default_user()
		payload = request.data.copy()
		payload['user'] = user.id
		serializer = RecordingClipSerializer(data=payload)
		if serializer.is_valid():
			serializer.save(user=user)
			return Response(serializer.data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RecordingSessionView(APIView):
	parser_classes = [JSONParser]

	def get(self, request):
		sessions = RecordingSession.objects.order_by('-created_at')[:100]
		serializer = RecordingSessionSerializer(sessions, many=True)
		return Response(serializer.data)

	def post(self, request):
		user, _profile = get_or_create_default_user()
		payload = request.data.copy()
		payload['user'] = user.id
		serializer = RecordingSessionSerializer(data=payload)
		if serializer.is_valid():
			serializer.save(user=user)
			return Response(serializer.data, status=status.HTTP_201_CREATED)
		return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RecordingSessionDetailView(APIView):
	def delete(self, request, session_id):
		try:
			session = RecordingSession.objects.get(id=session_id)
		except RecordingSession.DoesNotExist:
			return Response({'detail': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

		# delete associated clips sharing the session_id string
		RecordingClip.objects.filter(session_id=session.session_id).delete()
		session.delete()
		return Response(status=status.HTTP_204_NO_CONTENT)
