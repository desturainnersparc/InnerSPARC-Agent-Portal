from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0014_securitysettings_loginsecuritystate"),
    ]

    operations = [
        migrations.CreateModel(
            name="PlatformSecuritySettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "session_timeout_seconds",
                    models.PositiveIntegerField(
                        choices=[
                            (900, "15 minutes"),
                            (1800, "30 minutes"),
                            (3600, "1 hour"),
                            (7200, "2 hours"),
                        ],
                        default=1800,
                    ),
                ),
                (
                    "login_attempt_limit",
                    models.PositiveIntegerField(
                        choices=[(3, "3 attempts"), (5, "5 attempts"), (10, "10 attempts")],
                        default=5,
                    ),
                ),
                ("lockout_minutes", models.PositiveIntegerField(default=5)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name="AccountLoginSecurityState",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("failed_attempts", models.PositiveIntegerField(default=0)),
                ("lockout_until", models.DateTimeField(blank=True, null=True)),
                ("last_failed_at", models.DateTimeField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="login_security_state",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
    ]
