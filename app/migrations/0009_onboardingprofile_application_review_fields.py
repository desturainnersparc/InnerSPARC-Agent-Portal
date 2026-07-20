from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0008_onboardingprofile_photo_2x2"),
    ]

    operations = [
        migrations.AddField(
            model_name="onboardingprofile",
            name="application_status",
            field=models.CharField(
                choices=[
                    ("Pending", "Pending"),
                    ("Approved", "Approved"),
                    ("Rejected", "Rejected"),
                ],
                default="Pending",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="onboardingprofile",
            name="rejection_reason",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="onboardingprofile",
            name="reviewed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
