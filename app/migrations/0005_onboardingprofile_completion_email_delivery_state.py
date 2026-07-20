from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0004_rename_onboardingprofile_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="onboardingprofile",
            name="completion_email_last_attempt_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="onboardingprofile",
            name="completion_email_last_error",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="onboardingprofile",
            name="completion_email_sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="onboardingprofile",
            name="completion_email_status",
            field=models.CharField(
                choices=[
                    ("none", "None"),
                    ("pending", "Pending"),
                    ("sent", "Sent"),
                    ("failed", "Failed"),
                ],
                default="none",
                max_length=20,
            ),
        ),
    ]
