import uuid

from django.contrib.auth import get_user_model
from django.db import models


class UserProfile(models.Model):
	user = models.OneToOneField(get_user_model(), on_delete=models.CASCADE, related_name='profile')
	phone = models.CharField(max_length=50, blank=True)
	role = models.CharField(max_length=120, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self) -> str:
		return f"Profile for {self.user.username}"


class ConsentSignature(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	signer_name = models.CharField(max_length=120)
	signer_email = models.EmailField(blank=True)
	doc_label = models.CharField(max_length=120)
	signature_file = models.ImageField(upload_to='signatures/')
	detection_status = models.CharField(max_length=60, blank=True)
	detection_notes = models.TextField(blank=True)
	checked_at = models.DateTimeField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self) -> str:
		return f"{self.doc_label} - {self.signer_name}"


class SignatureCheckLog(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	signature = models.ForeignKey(ConsentSignature, on_delete=models.CASCADE, related_name='checks')
	status = models.CharField(max_length=60)
	score = models.FloatField(null=True, blank=True)
	notes = models.TextField(blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self) -> str:
		return f"Check for {self.signature_id}: {self.status}"


class QuestionnaireSubmission(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	user = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True)
	questionnaire_id = models.CharField(max_length=120)
	answers = models.JSONField()
	submitted_at = models.DateTimeField(auto_now_add=True)

	def __str__(self) -> str:
		return f"Submission {self.questionnaire_id}"


def recording_upload_path(instance, filename):
	return f"recordings/{instance.session_id}/{filename}"


class RecordingClip(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	user = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True)
	session_id = models.CharField(max_length=64, db_index=True)
	prompt = models.CharField(max_length=120)
	phase = models.PositiveIntegerField(default=1)
	audio_file = models.FileField(upload_to=recording_upload_path)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self) -> str:
		return f"Clip {self.prompt} ({self.session_id})"


class RecordingSession(models.Model):
	id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
	user = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True)
	session_id = models.CharField(max_length=64, unique=True)
	clip_count = models.PositiveIntegerField(default=0)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self) -> str:
		return f"Recording session {self.session_id}"
