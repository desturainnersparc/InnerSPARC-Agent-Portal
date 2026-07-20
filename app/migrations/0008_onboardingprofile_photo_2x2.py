from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0007_onboardingprofile_agent_readiness_quiz_score"),
    ]

    operations = [
        migrations.AddField(
            model_name="onboardingprofile",
            name="photo_2x2",
            field=models.FileField(blank=True, null=True, upload_to="onboarding/agent_requirements/photo_2x2/"),
        ),
    ]
