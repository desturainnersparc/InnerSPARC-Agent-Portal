from django.db import migrations, models


def normalize_completion_email_status(apps, schema_editor):
    OnboardingProfile = apps.get_model("app", "OnboardingProfile")
    OnboardingProfile.objects.filter(completion_email_status="none").update(completion_email_status="no_email")


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0005_onboardingprofile_completion_email_delivery_state"),
    ]

    operations = [
        migrations.RunPython(normalize_completion_email_status, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="onboardingprofile",
            name="completion_email_status",
            field=models.CharField(
                choices=[
                    ("no_email", "No Email"),
                    ("pending", "Pending"),
                    ("sent", "Sent"),
                    ("failed", "Failed"),
                ],
                default="no_email",
                max_length=20,
            ),
        ),
    ]
