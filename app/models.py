from django.db import models
from django.conf import settings


class UserProfile(models.Model):
	GENDER_MALE = "male"
	GENDER_FEMALE = "female"
	GENDER_PREFER_NOT_TO_SAY = "prefer_not_to_say"
	GENDER_CHOICES = [
		(GENDER_MALE, "Male"),
		(GENDER_FEMALE, "Female"),
		(GENDER_PREFER_NOT_TO_SAY, "Prefer not to say"),
	]

	user = models.OneToOneField(
		settings.AUTH_USER_MODEL,
		on_delete=models.CASCADE,
		related_name="profile",
	)
	phone_number = models.CharField(max_length=20, blank=True, default="")
	birthdate = models.DateField(blank=True, null=True)
	gender = models.CharField(max_length=32, choices=GENDER_CHOICES, blank=True, default="")

	def __str__(self):
		return f"profile:{self.user_id}"


class OnboardingStepCompletion(models.Model):
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
	step_key = models.CharField(max_length=120, db_index=True)
	completed_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		constraints = [
			models.UniqueConstraint(fields=["user", "step_key"], name="uniq_onboarding_user_step"),
		]

	def __str__(self):
		return f"{self.user_id}:{self.step_key}"


class OnboardingProfile(models.Model):
	EMAIL_STATUS_NO_EMAIL = "no_email"
	EMAIL_STATUS_PENDING = "pending"
	EMAIL_STATUS_SENT = "sent"
	EMAIL_STATUS_FAILED = "failed"
	EMAIL_STATUS_CHOICES = [
		(EMAIL_STATUS_NO_EMAIL, "No Email"),
		(EMAIL_STATUS_PENDING, "Pending"),
		(EMAIL_STATUS_SENT, "Sent"),
		(EMAIL_STATUS_FAILED, "Failed"),
	]

	user = models.OneToOneField(
		settings.AUTH_USER_MODEL,
		on_delete=models.CASCADE,
		related_name="onboarding_profile",
	)
	residential_address = models.TextField(blank=True, default="")
	valid_government_id = models.FileField(upload_to="onboarding/valid_government_id/", blank=True, null=True)
	proof_of_education = models.FileField(upload_to="onboarding/agent_requirements/education/", blank=True, null=True)
	government_clearance_nbi = models.FileField(upload_to="onboarding/agent_requirements/nbi/", blank=True, null=True)
	photo_2x2 = models.FileField(upload_to="onboarding/agent_requirements/photo_2x2/", blank=True, null=True)
	photo_1x1 = models.FileField(upload_to="onboarding/agent_requirements/photo_1x1/", blank=True, null=True)
	psa_birth_certificate = models.FileField(upload_to="onboarding/agent_requirements/psa/", blank=True, null=True)
	tin_verification = models.FileField(upload_to="onboarding/agent_requirements/tin/", blank=True, null=True)
	prc_accreditation_id = models.FileField(upload_to="onboarding/agent_requirements/prc/", blank=True, null=True)
	dhsud_certificate = models.FileField(upload_to="onboarding/agent_requirements/dhsud/", blank=True, null=True)
	agent_readiness_quiz_score = models.IntegerField(null=True, blank=True)
	training_module_scores = models.JSONField(blank=True, default=dict)
	completion_email_status = models.CharField(max_length=20, choices=EMAIL_STATUS_CHOICES, default=EMAIL_STATUS_NO_EMAIL)
	completion_email_sent_at = models.DateTimeField(blank=True, null=True)
	completion_email_last_error = models.TextField(blank=True, default="")
	completion_email_last_attempt_at = models.DateTimeField(blank=True, null=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self):
		return f"onboarding-profile:{self.user_id}"


class PlatformSecuritySettings(models.Model):
	"""Singleton-like model for platform-wide security configuration."""

	SESSION_TIMEOUT_15_MIN = 15 * 60
	SESSION_TIMEOUT_30_MIN = 30 * 60
	SESSION_TIMEOUT_1_HOUR = 60 * 60
	SESSION_TIMEOUT_2_HOUR = 2 * 60 * 60
	SESSION_TIMEOUT_CHOICES = [
		(SESSION_TIMEOUT_15_MIN, "15 minutes"),
		(SESSION_TIMEOUT_30_MIN, "30 minutes"),
		(SESSION_TIMEOUT_1_HOUR, "1 hour"),
		(SESSION_TIMEOUT_2_HOUR, "2 hours"),
	]

	LOGIN_ATTEMPTS_3 = 3
	LOGIN_ATTEMPTS_5 = 5
	LOGIN_ATTEMPTS_10 = 10
	LOGIN_ATTEMPT_CHOICES = [
		(LOGIN_ATTEMPTS_3, "3 attempts"),
		(LOGIN_ATTEMPTS_5, "5 attempts"),
		(LOGIN_ATTEMPTS_10, "10 attempts"),
	]

	session_timeout_seconds = models.PositiveIntegerField(
		choices=SESSION_TIMEOUT_CHOICES,
		default=SESSION_TIMEOUT_30_MIN,
	)
	login_attempt_limit = models.PositiveIntegerField(
		choices=LOGIN_ATTEMPT_CHOICES,
		default=LOGIN_ATTEMPTS_5,
	)
	lockout_minutes = models.PositiveIntegerField(default=5)
	updated_at = models.DateTimeField(auto_now=True)

	@classmethod
	def get_solo(cls):
		obj = cls.objects.order_by("id").first()
		if obj:
			return obj
		return cls.objects.create()

	def __str__(self):
		return "Platform Security Settings"


class AccountLoginSecurityState(models.Model):
	user = models.OneToOneField(
		settings.AUTH_USER_MODEL,
		on_delete=models.CASCADE,
		related_name="login_security_state",
	)
	failed_attempts = models.PositiveIntegerField(default=0)
	lockout_until = models.DateTimeField(blank=True, null=True)
	last_failed_at = models.DateTimeField(blank=True, null=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self):
		return f"login-security:{self.user_id}"


class TrainingComment(models.Model):
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
	module_id = models.CharField(max_length=120)
	text = models.TextField()
	parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="replies")
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["created_at"]

	def __str__(self):
		return f"comment:{self.id}:{self.module_id}"
