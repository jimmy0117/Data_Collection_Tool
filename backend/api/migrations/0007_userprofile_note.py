from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_userprofile_status_checked'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='note',
            field=models.TextField(blank=True),
        ),
    ]
