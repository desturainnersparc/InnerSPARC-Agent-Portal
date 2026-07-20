from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0002_userprofile"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="OnboardingProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("residential_address", models.TextField(blank=True, default="")),
                (
                    "valid_government_id",
                    models.FileField(blank=True, null=True, upload_to="onboarding/valid_government_id/"),
                ),
                (
                    "proof_of_education",
                    models.FileField(blank=True, null=True, upload_to="onboarding/agent_requirements/education/"),
                ),
                (
                    "nbi_clearance",
                    models.FileField(blank=True, null=True, upload_to="onboarding/agent_requirements/nbi/"),
                ),
                (
                    "psa_birth_certificate",
                    models.FileField(blank=True, null=True, upload_to="onboarding/agent_requirements/psa/"),
                ),
                (
                    "tin_verification",
                    models.FileField(blank=True, null=True, upload_to="onboarding/agent_requirements/tin/"),
                ),
                (
                    "prc_accreditation",
                    models.FileField(blank=True, null=True, upload_to="onboarding/agent_requirements/prc/"),
                ),
                (
                    "dhsud_certificate",
                    models.FileField(blank=True, null=True, upload_to="onboarding/agent_requirements/dhsud/"),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=models.deletion.CASCADE,
                        related_name="onboarding_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
    ]
