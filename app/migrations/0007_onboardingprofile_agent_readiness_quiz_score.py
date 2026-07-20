from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0006_normalize_onboarding_completion_email_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="onboardingprofile",
            name="agent_readiness_quiz_score",
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
