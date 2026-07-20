from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0010_onboardingprofile_photo_1x1"),
        ("app", "0010_remove_onboardingprofile_application_status_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="birthdate",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="gender",
            field=models.CharField(
                blank=True,
                choices=[
                    ("male", "Male"),
                    ("female", "Female"),
                    ("prefer_not_to_say", "Prefer not to say"),
                ],
                default="",
                max_length=32,
            ),
        ),
    ]
