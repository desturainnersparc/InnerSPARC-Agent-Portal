import json
import shutil
import tempfile
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from .models import OnboardingProfile, OnboardingStepCompletion
from .views import AGENT_FOUNDATION_MODULE_DEFINITIONS


@override_settings()
class OnboardingProfileApiTests(TestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		cls._media_root = tempfile.mkdtemp(prefix="test-media-")
		cls._override = override_settings(MEDIA_ROOT=cls._media_root)
		cls._override.enable()

	@classmethod
	def tearDownClass(cls):
		cls._override.disable()
		shutil.rmtree(cls._media_root, ignore_errors=True)
		super().tearDownClass()

	def setUp(self):
		User = get_user_model()
		self.user = User.objects.create_user(
			username="agent@example.com",
			email="agent@example.com",
			password="TestPass123!",
			first_name="Agent",
			last_name="User",
		)
		self.client.login(username="agent@example.com", password="TestPass123!")

	def _valid_upload(self, name):
		return SimpleUploadedFile(name, b"fake-file-content", content_type="application/pdf")

	def _valid_image_upload(self, name):
		return SimpleUploadedFile(name, b"fake-image-content", content_type="image/jpeg")

	def test_profile_identity_save_and_fetch_persists_address_and_filename(self):
		save_response = self.client.post(
			reverse("portal_onboarding_profile_identity_save"),
			{
				"first_name": "Agent",
				"last_name": "User",
				"email": "agent@example.com",
				"phone_number": "9123456789",
				"birthdate": "1992-03-26",
				"gender": "male",
				"residential_address": "123 Main Street",
			},
		)

		self.assertEqual(save_response.status_code, 200)
		save_payload = save_response.json()
		self.assertTrue(save_payload["ok"])

		profile = OnboardingProfile.objects.get(user=self.user)
		self.assertEqual(profile.residential_address, "123 Main Street")
		self.assertFalse(bool(profile.valid_government_id))

		fetch_response = self.client.get(reverse("portal_onboarding_profile_data"))
		self.assertEqual(fetch_response.status_code, 200)
		fetch_payload = fetch_response.json()
		self.assertTrue(fetch_payload["ok"])
		self.assertEqual(fetch_payload["data"]["residential_address"], "123 Main Street")
		self.assertEqual(fetch_payload["data"]["account"]["birthdate"], "1992-03-26")
		self.assertEqual(fetch_payload["data"]["account"]["gender"], "male")
		self.assertIsNone(fetch_payload["data"]["valid_government_id"])

	def test_profile_identity_requires_contact_fields_but_not_government_id(self):
		response = self.client.post(
			reverse("portal_onboarding_profile_identity_save"),
			{"residential_address": ""},
		)

		self.assertEqual(response.status_code, 400)
		payload = response.json()
		self.assertFalse(payload["ok"])
		self.assertIn("residential_address", payload["field_errors"])
		self.assertIn("phone_number", payload["field_errors"])
		self.assertNotIn("valid_government_id", payload["field_errors"])

	def test_profile_identity_rejects_non_10_digit_phone(self):
		response = self.client.post(
			reverse("portal_onboarding_profile_identity_save"),
			{
				"first_name": "Agent",
				"last_name": "User",
				"email": "agent@example.com",
				"phone_number": "91234",
				"birthdate": "1992-03-26",
				"gender": "female",
				"residential_address": "123 Main Street",
			},
		)

		self.assertEqual(response.status_code, 400)
		payload = response.json()
		self.assertFalse(payload["ok"])
		self.assertIn("phone_number", payload["field_errors"])

	def test_profile_data_requires_authentication(self):
		self.client.logout()
		response = self.client.get(reverse("portal_onboarding_profile_data"))
		self.assertEqual(response.status_code, 401)
		self.assertFalse(response.json()["ok"])

	def test_profile_identity_upload_requires_authentication(self):
		self.client.logout()
		response = self.client.post(
			reverse("portal_onboarding_profile_identity_save"),
			{"residential_address": "123 Main Street"},
		)
		self.assertEqual(response.status_code, 401)
		self.assertFalse(response.json()["ok"])

	def test_agent_documents_upload_requires_authentication(self):
		self.client.logout()
		response = self.client.post(reverse("portal_onboarding_agent_documents_save"), {})
		self.assertEqual(response.status_code, 401)
		self.assertFalse(response.json()["ok"])

	def test_avatar_upload_requires_authentication(self):
		self.client.logout()
		response = self.client.post(reverse("portal_onboarding_avatar_upload"), {})
		self.assertEqual(response.status_code, 401)
		self.assertFalse(response.json()["ok"])

	def test_avatar_upload_rejects_non_image(self):
		response = self.client.post(
			reverse("portal_onboarding_avatar_upload"),
			{"photo_2x2": self._valid_upload("avatar.pdf")},
		)

		self.assertEqual(response.status_code, 400)
		payload = response.json()
		self.assertFalse(payload["ok"])
		self.assertIn("photo_2x2", payload["field_errors"])

	def test_avatar_upload_updates_photo_2x2(self):
		response = self.client.post(
			reverse("portal_onboarding_avatar_upload"),
			{"photo_2x2": self._valid_image_upload("avatar.jpg")},
		)

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertTrue(payload["ok"])
		self.assertIsNotNone(payload["data"]["agent_requirement_documents"]["photo_2x2"])

		profile = OnboardingProfile.objects.get(user=self.user)
		self.assertTrue(profile.photo_2x2.name.endswith("avatar.jpg"))

	def test_agent_documents_upload_validation_and_success(self):
		bad_file = SimpleUploadedFile("bad.exe", b"binary", content_type="application/octet-stream")
		invalid_response = self.client.post(
			reverse("portal_onboarding_agent_documents_save"),
			{
				"proof_of_education": bad_file,
				"government_clearance_nbi": self._valid_upload("nbi.pdf"),
				"tin_verification": self._valid_upload("tin.pdf"),
				"photo_2x2": self._valid_image_upload("photo.jpg"),
			},
		)

		self.assertEqual(invalid_response.status_code, 400)
		invalid_payload = invalid_response.json()
		self.assertFalse(invalid_payload["ok"])
		self.assertIn("proof_of_education", invalid_payload["field_errors"])

		valid_response = self.client.post(
			reverse("portal_onboarding_agent_documents_save"),
			{
				"proof_of_education": self._valid_upload("education.pdf"),
				"government_clearance_nbi": self._valid_upload("nbi.pdf"),
				"tin_verification": self._valid_upload("tin.pdf"),
				"photo_2x2": self._valid_image_upload("photo.jpg"),
			},
		)

		self.assertEqual(valid_response.status_code, 200)
		valid_payload = valid_response.json()
		self.assertTrue(valid_payload["ok"])

		profile = OnboardingProfile.objects.get(user=self.user)
		self.assertTrue(profile.proof_of_education.name.endswith("education.pdf"))
		self.assertTrue(profile.government_clearance_nbi.name.endswith("nbi.pdf"))
		self.assertTrue(profile.tin_verification.name.endswith("tin.pdf"))
		self.assertTrue(profile.photo_2x2.name.endswith("photo.jpg"))

	def test_agent_documents_requires_photo_2x2(self):
		response = self.client.post(
			reverse("portal_onboarding_agent_documents_save"),
			{
				"proof_of_education": self._valid_upload("education.pdf"),
				"government_clearance_nbi": self._valid_upload("nbi.pdf"),
				"tin_verification": self._valid_upload("tin.pdf"),
			},
		)

		self.assertEqual(response.status_code, 400)
		payload = response.json()
		self.assertFalse(payload["ok"])
		self.assertIn("photo_2x2", payload["field_errors"])

	def test_agent_documents_rejects_non_image_photo_2x2(self):
		response = self.client.post(
			reverse("portal_onboarding_agent_documents_save"),
			{
				"proof_of_education": self._valid_upload("education.pdf"),
				"government_clearance_nbi": self._valid_upload("nbi.pdf"),
				"tin_verification": self._valid_upload("tin.pdf"),
				"photo_2x2": self._valid_upload("photo.pdf"),
			},
		)

		self.assertEqual(response.status_code, 400)
		payload = response.json()
		self.assertFalse(payload["ok"])
		self.assertIn("photo_2x2", payload["field_errors"])

	def test_step_complete_accepts_company_overview_key(self):
		response = self.client.post(
			reverse("portal_onboarding_step_complete"),
			data='{"step_key":"beta_step_company_overview_done"}',
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertTrue(payload["ok"])
		self.assertEqual(payload["step_key"], "beta_step_company_overview_done")
		self.assertTrue(
			OnboardingStepCompletion.objects.filter(
				user=self.user,
				step_key="beta_step_company_overview_done",
			).exists()
		)

	def test_step_complete_accepts_quiz_key_and_persists_score(self):
		prereq_keys = [
			"beta_step_company_overview_done",
			"beta_step_profile_identity_done",
			"beta_step_agent_requirements_docs_done",
			"beta_video_1_done",
			"beta_video_2_done",
			"beta_video_3_done",
			"beta_video_4_done",
			"beta_video_5_done",
		]
		for key in prereq_keys:
			OnboardingStepCompletion.objects.get_or_create(user=self.user, step_key=key)

		response = self.client.post(
			reverse("portal_onboarding_step_complete"),
			data='{"step_key":"beta_step_agent_readiness_quiz_done","score":85}',
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertTrue(payload["ok"])
		self.assertEqual(payload["step_key"], "beta_step_agent_readiness_quiz_done")
		self.assertTrue(
			OnboardingStepCompletion.objects.filter(
				user=self.user,
				step_key="beta_step_agent_readiness_quiz_done",
			).exists()
		)

		profile = OnboardingProfile.objects.get(user=self.user)
		self.assertEqual(profile.agent_readiness_quiz_score, 85)

	@override_settings(ONBOARDING_DEV_UNLOCK_ALL=False)
	def test_step_complete_rejects_invalid_step_when_dev_unlock_disabled(self):
		response = self.client.post(
			reverse("portal_onboarding_step_complete"),
			data='{"step_key":"beta_step_invalid_for_test"}',
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 400)
		payload = response.json()
		self.assertFalse(payload["ok"])
		self.assertEqual(payload["code"], "INVALID_STEP_KEY")

	@override_settings(ONBOARDING_DEV_UNLOCK_ALL=False)
	def test_step_complete_enforces_dependency_lock_when_dev_unlock_disabled(self):
		response = self.client.post(
			reverse("portal_onboarding_step_complete"),
			data='{"step_key":"beta_step_review_done"}',
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 400)
		payload = response.json()
		self.assertFalse(payload["ok"])
		self.assertEqual(payload["code"], "STEP_LOCKED")

	@override_settings(ONBOARDING_DEV_UNLOCK_ALL=True)
	def test_step_complete_accepts_invalid_step_when_dev_unlock_enabled(self):
		response = self.client.post(
			reverse("portal_onboarding_step_complete"),
			data='{"step_key":"beta_step_invalid_for_test"}',
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertTrue(payload["ok"])
		self.assertEqual(payload["step_key"], "beta_step_invalid_for_test")
		self.assertTrue(
			OnboardingStepCompletion.objects.filter(
				user=self.user,
				step_key="beta_step_invalid_for_test",
			).exists()
		)

	def test_step_complete_bypasses_dependency_lock_when_dev_unlock_enabled(self):
		response = self.client.post(
			reverse("portal_onboarding_step_complete"),
			data='{"step_key":"beta_step_review_done"}',
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertTrue(payload["ok"])
		self.assertEqual(payload["step_key"], "beta_step_review_done")
		self.assertTrue(
			OnboardingStepCompletion.objects.filter(
				user=self.user,
				step_key="beta_step_review_done",
			).exists()
		)

	@override_settings(ONBOARDING_DEV_UNLOCK_ALL=True)
	def test_template_beta_renders_dev_unlock_flag_true(self):
		response = self.client.get(reverse("template_beta"))
		self.assertEqual(response.status_code, 200)
		self.assertContains(response, "window.ONBOARDING_DEV_UNLOCK_ALL = true;")

	def test_saved_onboarding_data_visible_after_refresh(self):
		OnboardingProfile.objects.create(
			user=self.user,
			residential_address="Unit 4, Refresh Street",
		)

		page_response = self.client.get(reverse("template_beta"))
		self.assertEqual(page_response.status_code, 200)
		self.assertContains(page_response, 'data-onboarding-data-url="/portal-onboarding/profile-data/"')

		data_response = self.client.get(reverse("portal_onboarding_profile_data"))
		self.assertEqual(data_response.status_code, 200)
		self.assertEqual(data_response.json()["data"]["residential_address"], "Unit 4, Refresh Street")


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class TestOnboardingCompletionEmail(TestCase):
	def setUp(self):
		User = get_user_model()
		self.user = User.objects.create_user(
			username="complete@example.com",
			email="complete@example.com",
			password="TestPass123!",
			first_name="Complete",
			last_name="User",
		)
		self.client.login(username="complete@example.com", password="TestPass123!")

	def test_completion_email_no_user_email_sets_no_email_status(self):
		self.user.email = ""
		self.user.save(update_fields=["email"])

		response = self.client.post(reverse("portal_onboarding_complete"), {"completed": True})
		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertTrue(payload["ok"])
		self.assertEqual(payload["email_status"], "no_email")

		profile = OnboardingProfile.objects.get(user=self.user)
		self.assertEqual(profile.completion_email_status, OnboardingProfile.EMAIL_STATUS_NO_EMAIL)
		self.assertEqual(profile.completion_email_last_error, "")
		self.assertIsNotNone(profile.completion_email_last_attempt_at)

	def test_completion_email_success_sets_sent_status(self):
		response = self.client.post(reverse("portal_onboarding_complete"), {"completed": True})
		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertTrue(payload["ok"])
		self.assertTrue(payload["email_sent"])
		self.assertEqual(payload["email_status"], "sent")
		self.assertEqual(payload["code"], "ONBOARDING_COMPLETION_EMAIL_SENT")

		profile = OnboardingProfile.objects.get(user=self.user)
		self.assertEqual(profile.completion_email_status, OnboardingProfile.EMAIL_STATUS_SENT)
		self.assertEqual(profile.completion_email_last_error, "")
		self.assertIsNotNone(profile.completion_email_sent_at)
		self.assertEqual(len(mail.outbox), 1)

	def test_completion_email_has_pdf_attachment(self):
		"""Completion email must include a PDF certificate as an attachment."""
		response = self.client.post(reverse("portal_onboarding_complete"), {"completed": True})
		self.assertEqual(response.status_code, 200)
		self.assertEqual(len(mail.outbox), 1)

		sent_email = mail.outbox[0]
		# Gather all MIME attachments from the message
		pdf_attachments = [
			attachment
			for attachment in sent_email.attachments
			if isinstance(attachment, tuple) and attachment[2] == "application/pdf"
		]
		self.assertTrue(
			pdf_attachments,
			"Completion email did not include a PDF certificate attachment.",
		)
		filename, pdf_data, mime_type = pdf_attachments[0]
		self.assertEqual(filename, "certificate.pdf")
		self.assertEqual(mime_type, "application/pdf")
		# Verify the bytes start with the PDF magic header
		self.assertTrue(
			pdf_data[:4] == b"%PDF",
			"Attached certificate.pdf does not start with PDF magic bytes.",
		)

	@patch("app.tasks.EmailMultiAlternatives.send", side_effect=RuntimeError("provider down"))
	def test_completion_email_provider_failure_sets_failed_status(self, _send_mock):
		response = self.client.post(reverse("portal_onboarding_complete"), {"completed": True})
		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertTrue(payload["ok"])
		self.assertFalse(payload["email_sent"])
		self.assertEqual(payload["email_status"], "failed")
		self.assertEqual(payload["code"], "ONBOARDING_COMPLETION_EMAIL_FAILED")

		profile = OnboardingProfile.objects.get(user=self.user)
		self.assertEqual(profile.completion_email_status, OnboardingProfile.EMAIL_STATUS_FAILED)
		self.assertIn("RuntimeError", profile.completion_email_last_error)
		self.assertIsNotNone(profile.completion_email_last_attempt_at)

	@override_settings(EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend")
	def test_completion_email_console_backend_sets_failed_status(self):
		response = self.client.post(reverse("portal_onboarding_complete"), {"completed": True})
		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertTrue(payload["ok"])
		self.assertFalse(payload["email_sent"])
		self.assertEqual(payload["email_status"], "failed")
		self.assertEqual(payload["code"], "ONBOARDING_COMPLETION_EMAIL_FAILED")
		self.assertIn("EMAIL_BACKEND", payload.get("error", ""))

		profile = OnboardingProfile.objects.get(user=self.user)
		self.assertEqual(profile.completion_email_status, OnboardingProfile.EMAIL_STATUS_FAILED)
		self.assertIn("EMAIL_BACKEND", profile.completion_email_last_error)
		self.assertIsNotNone(profile.completion_email_last_attempt_at)

	@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
	def test_admin_send_training_reminder_sends_email(self):
		User = get_user_model()
		admin_user = User.objects.create_superuser(
			username="admin@example.com",
			email="admin@example.com",
			password="AdminPass123!",
		)
		target_user = User.objects.create_user(
			username="reminder@example.com",
			email="reminder@example.com",
			password="TestPass123!",
			first_name="Reminder",
			last_name="User",
		)
		self.client.logout()
		self.client.login(username="admin@example.com", password="AdminPass123!")

		response = self.client.post(
			reverse("admin_send_training_reminder"),
			data=json.dumps({"user_id": target_user.id}),
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertTrue(payload["success"])
		self.assertEqual(len(mail.outbox), 1)
		self.assertEqual(mail.outbox[0].to, ["reminder@example.com"])
		self.assertIn("Continue your Inner SPARC training", mail.outbox[0].subject)

	@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
	def test_loom_completion_sends_congratulations_email(self):
		User = get_user_model()
		self.user.email = "loom@example.com"
		self.user.save(update_fields=["email"])

		# Create all Loom step completions except the last one.
		loom_step_keys = [
			"beta_video_module13_1_done",
			"beta_video_module13_2_done",
			"beta_video_module13_3_done",
			"beta_video_module13_4_done",
		]
		for step_key in loom_step_keys:
			OnboardingStepCompletion.objects.create(user=self.user, step_key=step_key)

		response = self.client.post(
			reverse("portal_onboarding_step_complete"),
			data='{"step_key":"beta_video_module13_5_done","completion_reason":"watch_complete"}',
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 200)
		self.assertTrue(response.json()["ok"])
		self.assertEqual(len(mail.outbox), 1)
		self.assertIn("Congratulations — you finished the Loom videos", mail.outbox[0].subject)

	@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
	def test_inactivity_reminder_sends_after_7_days(self):
		User = get_user_model()
		self.user.date_joined = timezone.now() - timedelta(days=8)
		self.user.save(update_fields=["date_joined"])
		OnboardingStepCompletion.objects.filter(user=self.user).delete()

		response = self.client.get(reverse("portal_onboarding_profile_data"))
		self.assertEqual(response.status_code, 200)
		self.assertEqual(len(mail.outbox), 1)
		self.assertIn("Friendly reminder: Continue your Inner SPARC training", mail.outbox[0].subject)


@override_settings(
	EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
	ONBOARDING_DEV_UNLOCK_ALL=True,
)
class TestAutoTriggerCompletionEmail(TestCase):
	"""Verify the server-side fallback in portal_onboarding_step_complete triggers
	the completion email when the final Agent Foundation training step is saved."""

	def setUp(self):
		User = get_user_model()
		self.user = User.objects.create_user(
			username="autotrigger@example.com",
			email="autotrigger@example.com",
			password="TestPass123!",
			first_name="Auto",
			last_name="Trigger",
		)
		self.client.login(username="autotrigger@example.com", password="TestPass123!")

		# Collect all Agent Foundation step keys
		all_steps = [
			step
			for module in AGENT_FOUNDATION_MODULE_DEFINITIONS
			for step in module.get("steps", [])
		]
		# Use the last step as the one to complete via the API
		self.final_step_key = all_steps[-1]
		prior_steps = all_steps[:-1]

		# Pre-create completions for every step except the final one
		prior_completions = [
			OnboardingStepCompletion(user=self.user, step_key=sk)
			for sk in prior_steps
		]
		OnboardingStepCompletion.objects.bulk_create(prior_completions)

	def test_completing_final_training_step_sends_completion_email(self):
		response = self.client.post(
			reverse("portal_onboarding_step_complete"),
			data=f'{{"step_key":"{self.final_step_key}","completion_reason":"watch_complete"}}',
			content_type="application/json",
		)
		self.assertEqual(response.status_code, 200)
		self.assertTrue(response.json()["ok"])

		# The completion email should have been sent automatically
		self.assertEqual(len(mail.outbox), 1)
		profile = OnboardingProfile.objects.get(user=self.user)
		self.assertEqual(profile.completion_email_status, OnboardingProfile.EMAIL_STATUS_SENT)
		self.assertIsNotNone(profile.completion_email_sent_at)

	def test_completing_non_final_step_does_not_send_email(self):
		"""No email when not all training steps are done yet."""
		# Remove all pre-created completions so only one step is done
		OnboardingStepCompletion.objects.filter(user=self.user).delete()

		# Complete only the very first training step
		first_step_key = AGENT_FOUNDATION_MODULE_DEFINITIONS[0]["steps"][0]
		response = self.client.post(
			reverse("portal_onboarding_step_complete"),
			data=f'{{"step_key":"{first_step_key}","completion_reason":"watch_complete"}}',
			content_type="application/json",
		)
		self.assertEqual(response.status_code, 200)
		self.assertTrue(response.json()["ok"])

		# No email should have been sent
		self.assertEqual(len(mail.outbox), 0)

	def test_completing_final_step_twice_sends_email_only_once(self):
		"""Second completion of the same final step must not trigger a duplicate email."""
		# Complete the final step the first time
		self.client.post(
			reverse("portal_onboarding_step_complete"),
			data=f'{{"step_key":"{self.final_step_key}","completion_reason":"watch_complete"}}',
			content_type="application/json",
		)
		self.assertEqual(len(mail.outbox), 1)

		# Complete (idempotent) a second time
		self.client.post(
			reverse("portal_onboarding_step_complete"),
			data=f'{{"step_key":"{self.final_step_key}","completion_reason":"watch_complete"}}',
			content_type="application/json",
		)
		# Still only one email
		self.assertEqual(len(mail.outbox), 1)
