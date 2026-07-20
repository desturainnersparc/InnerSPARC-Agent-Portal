from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

	dependencies = [
		("app", "0013_remove_onboardingprofile_application_review_decision_and_more"),
		migrations.swappable_dependency(settings.AUTH_USER_MODEL),
	]

	operations = [
		migrations.CreateModel(
			name="SecuritySettings",
			fields=[
				("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
				(
					"session_timeout_minutes",
					models.PositiveIntegerField(
						choices=[(15, "15 minutes"), (30, "30 minutes"), (60, "1 hour"), (120, "2 hours")],
						default=30,
					),
				),
				(
					"login_attempt_limit",
					models.PositiveIntegerField(
						choices=[(3, "3 attempts"), (5, "5 attempts"), (10, "10 attempts")],
						default=5,
					),
				),
				("lockout_duration_minutes", models.PositiveIntegerField(default=5)),
				("updated_at", models.DateTimeField(auto_now=True)),
			],
		),
		migrations.CreateModel(
			name="LoginSecurityState",
			fields=[
				("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
				("failed_attempts", models.PositiveIntegerField(default=0)),
				("lockout_until", models.DateTimeField(blank=True, null=True)),
				("updated_at", models.DateTimeField(auto_now=True)),
				(
					"user",
					models.OneToOneField(
						on_delete=models.deletion.CASCADE,
						related_name="login_security_state",
						to=settings.AUTH_USER_MODEL,
					),
				),
			],
		),
	]
