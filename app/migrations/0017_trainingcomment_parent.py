from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0016_trainingcomment"),
    ]

    operations = [
        migrations.AddField(
            model_name="trainingcomment",
            name="parent",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="replies",
                to="app.trainingcomment",
            ),
        ),
    ]
