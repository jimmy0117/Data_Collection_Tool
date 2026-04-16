from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_admin_audit_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='subject_status',
            field=models.CharField(
                choices=[('TEST', 'Test'), ('DONE', 'Done')],
                default='TEST',
                max_length=20,
            ),
        ),
    ]
