from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0002_recordingclip_recordingsession'),
    ]

    operations = [
        migrations.AddField(
            model_name='consentsignature',
            name='user',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='consent_signatures',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
