from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0017_trainingcomment_parent"),
    ]

    operations = [
        migrations.AddField(
            model_name="onboardingprofile",
            name="training_module_scores",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
