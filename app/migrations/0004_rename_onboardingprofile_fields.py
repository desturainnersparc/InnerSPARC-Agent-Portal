from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0003_onboardingprofile"),
    ]

    operations = [
        migrations.RenameField(
            model_name="onboardingprofile",
            old_name="nbi_clearance",
            new_name="government_clearance_nbi",
        ),
        migrations.RenameField(
            model_name="onboardingprofile",
            old_name="prc_accreditation",
            new_name="prc_accreditation_id",
        ),
    ]
