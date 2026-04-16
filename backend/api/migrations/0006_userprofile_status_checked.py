from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_userprofile_subject_status'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userprofile',
            name='subject_status',
            field=models.CharField(
                choices=[('TEST', 'Test'), ('DONE', 'Done'), ('CHECKED', 'Checked')],
                default='TEST',
                max_length=20,
            ),
        ),
    ]
