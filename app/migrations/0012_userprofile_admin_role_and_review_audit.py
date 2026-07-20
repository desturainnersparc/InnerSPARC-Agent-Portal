from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0011_userprofile_birthdate_gender"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="admin_role",
            field=models.CharField(
                choices=[("administrator", "Administrator"), ("reviewer", "Reviewer")],
                default="administrator",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="onboardingprofile",
            name="application_review_decision",
            field=models.CharField(
                blank=True,
                choices=[("approved", "Approved"), ("rejected", "Rejected")],
                default="",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="onboardingprofile",
            name="application_reviewed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="onboardingprofile",
            name="application_reviewer_name",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
