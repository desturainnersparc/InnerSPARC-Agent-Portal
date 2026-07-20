from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0009_onboardingprofile_application_review_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="onboardingprofile",
            name="photo_1x1",
            field=models.FileField(blank=True, null=True, upload_to="onboarding/agent_requirements/photo_1x1/"),
        ),
    ]
