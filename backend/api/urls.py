from django.urls import path
from .views import (
    ConsentSignatureView,
    ConsentSignatureDetailView,
    ProfileView,
    QuestionnaireSubmissionView,
    QuestionnaireSubmissionDetailView,
    SignatureCheckLogView,
    RecordingClipView,
    RecordingSessionView,
    RecordingSessionDetailView,
)

urlpatterns = [
    path('profile/', ProfileView.as_view(), name='profile'),
    path('signatures/', ConsentSignatureView.as_view(), name='consent-signatures'),
    path('signatures/<uuid:signature_id>/', ConsentSignatureDetailView.as_view(), name='consent-signatures-detail'),
    path('signatures/<uuid:signature_id>/checks/', SignatureCheckLogView.as_view(), name='signature-checks'),
    path('questionnaires/', QuestionnaireSubmissionView.as_view(), name='questionnaire-submissions'),
    path('questionnaires/<uuid:submission_id>/', QuestionnaireSubmissionDetailView.as_view(), name='questionnaire-submissions-detail'),
    path('recordings/', RecordingClipView.as_view(), name='recording-clips'),
    path('recording-sessions/', RecordingSessionView.as_view(), name='recording-sessions'),
    path('recording-sessions/<uuid:session_id>/', RecordingSessionDetailView.as_view(), name='recording-sessions-detail'),
]
