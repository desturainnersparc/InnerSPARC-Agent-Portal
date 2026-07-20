"""
CertificationPanel: Django Backend Integration Example Code

This file contains example Django view, model, and URL patterns
for supporting the CertificationPanel frontend component.

Copy and adapt these snippets to your app/views.py, app/models.py, etc.
"""

# ============================================================================
# MODELS: Example OnboardingProfile with certificate support
# ============================================================================

from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
import uuid


class OnboardingProfile(models.Model):
    """Extended user onboarding profile (example structure)"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='onboarding_profile')
    
    # Onboarding completion tracking
    completed_at = models.DateTimeField(null=True, blank=True, db_index=True)
    is_completed = models.BooleanField(default=False, db_index=True)
    
    # Certificate information
    certificate_id = models.CharField(
        max_length=64,
        unique=True,
        null=True,
        blank=True,
        help_text="Unique certificate identifier, e.g., OB-2026-00123"
    )
    certificate_issued_by = models.CharField(
        max_length=255,
        default='HR Department',
        help_text="Organization/department issuing the certificate"
    )
    certificate_logo_url = models.URLField(
        null=True,
        blank=True,
        help_text="URL to organization logo for certificate"
    )
    certificate_signature_name = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Name to display as certificate signer"
    )
    certificate_verification_text = models.TextField(
        null=True,
        blank=True,
        help_text="Additional verification or legal text"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'app_onboarding_profile'
        verbose_name = 'Onboarding Profile'
        verbose_name_plural = 'Onboarding Profiles'
    
    def __str__(self):
        return f"{self.user.get_full_name()} - Onboarding"
    
    def mark_as_completed(self):
        """Mark onboarding as complete and generate certificate"""
        if not self.is_completed:
            self.completed_at = timezone.now()
            self.is_completed = True
            
            # Generate unique certificate ID if not already set
            if not self.certificate_id:
                year = timezone.now().year
                base_id = f"OB-{year}-{self.user.id:05d}"
                self.certificate_id = base_id
            
            self.save()
            return True
        return False
    
    def get_certificate_context(self):
        """Return certificate data for CertificationPanel"""
        return {
            'fullName': self.user.get_full_name() or self.user.username,
            'programTitle': 'Employee Onboarding Program',
            'completionDate': self.completed_at.strftime('%B %d, %Y') if self.completed_at else None,
            'certificateId': self.certificate_id,
            'issuedBy': self.certificate_issued_by,
            'logoUrl': self.certificate_logo_url or '',
            'signatureName': self.certificate_signature_name or '',
            'verificationText': self.certificate_verification_text or ''
        }


# ============================================================================
# VIEWS: API endpoints for CertificationPanel
# ============================================================================

from django.http import JsonResponse, FileResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.middleware.csrf import get_token
from django.core.files.storage import default_storage
import json
from io import BytesIO
from datetime import datetime


@login_required
@require_http_methods(["GET"])
def profile_data_view(request):
    """
    GET /portal-onboarding/profile-data/
    
    Return user's onboarding profile for CertificationPanel initialization.
    Used by JavaScript to fetch completion status and certificate data.
    """
    try:
        user = request.user
        profile = user.onboarding_profile
        
        return JsonResponse({
            'success': True,
            'full_name': user.get_full_name() or user.username,
            'email': user.email,
            'is_completed': profile.is_completed,
            'completion_date': profile.completed_at.strftime('%B %d, %Y') if profile.completed_at else None,
            'certificate_id': profile.certificate_id or f'OB-{datetime.now().year}-{user.id:05d}',
            'certificate': profile.get_certificate_context() if profile.is_completed else None
        })
    except OnboardingProfile.DoesNotExist:
        return JsonResponse({
            'success': True,
            'full_name': request.user.get_full_name() or request.user.username,
            'email': request.user.email,
            'is_completed': False,
            'certificate': None
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@login_required
@require_http_methods(["POST"])
def download_certificate_view(request):
    """
    POST /portal-onboarding/download-certificate/
    
    Handle certificate download request.
    Implement PDF generation here using reportlab, WeasyPrint, or html2pdf.
    
    Request body example:
    {
        "certificate_id": "OB-2026-00123",
        "full_name": "John Doe",
        "program_title": "Employee Onboarding Program",
        "completion_date": "March 25, 2026",
        "issued_by": "HR Department"
    }
    """
    try:
        user = request.user
        data = json.loads(request.body)
        
        # Verify this is the user's own certificate
        profile = user.onboarding_profile
        if not profile.is_completed:
            return JsonResponse({
                'success': False,
                'error': 'Onboarding not completed'
            }, status=403)
        
        if data.get('certificate_id') != profile.certificate_id:
            return JsonResponse({
                'success': False,
                'error': 'Certificate ID mismatch'
            }, status=403)
        
        # TODO: Implement PDF generation
        # Option 1: Use reportlab
        # Option 2: Use WeasyPrint
        # Option 3: Render HTML template and convert to PDF
        
        # Placeholder: return mock response
        return JsonResponse({
            'success': True,
            'message': 'PDF generation not yet implemented',
            'certificate_id': profile.certificate_id
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


@login_required
@require_http_methods(["POST"])
def mark_onboarding_complete_view(request):
    """
    POST /portal-onboarding/complete/
    
    Mark user's onboarding as complete and generate certificate.
    Called when user finishes all steps.
    """
    try:
        user = request.user
        profile = user.onboarding_profile
        
        if profile.mark_as_completed():
            return JsonResponse({
                'success': True,
                'message': 'Onboarding completed successfully',
                'certificate': profile.get_certificate_context(),
                'certificate_id': profile.certificate_id
            })
        else:
            return JsonResponse({
                'success': True,
                'message': 'Onboarding already completed',
                'certificate': profile.get_certificate_context()
            })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)


# ============================================================================
# URLS: Register the endpoints
# ============================================================================

"""
Add to app/urls.py:

from django.urls import path
from . import views

urlpatterns = [
    # Certification/Certificate endpoints
    path('portal-onboarding/profile-data/', views.profile_data_view, name='profile_data'),
    path('portal-onboarding/download-certificate/', views.download_certificate_view, name='download_certificate'),
    path('portal-onboarding/complete/', views.mark_onboarding_complete_view, name='mark_complete'),
]
"""


# ============================================================================
# ADMIN: Manage certificates in Django admin
# ============================================================================

from django.contrib import admin


@admin.register(OnboardingProfile)
class OnboardingProfileAdmin(admin.ModelAdmin):
    """Django admin configuration for OnboardingProfile"""
    
    list_display = (
        'user',
        'is_completed',
        'completion_date_display',
        'certificate_id',
        'created_at'
    )
    list_filter = ('is_completed', 'created_at', 'updated_at')
    search_fields = ('user__username', 'user__email', 'certificate_id')
    readonly_fields = ('created_at', 'updated_at', 'display_certificate')
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Onboarding Status', {
            'fields': ('is_completed', 'completed_at')
        }),
        ('Certificate Information', {
            'fields': (
                'certificate_id',
                'certificate_issued_by',
                'certificate_logo_url',
                'certificate_signature_name',
                'certificate_verification_text',
                'display_certificate'
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def completion_date_display(self, obj):
        """Display completion date with formatting"""
        if obj.completed_at:
            return obj.completed_at.strftime('%B %d, %Y')
        return '—'
    completion_date_display.short_description = 'Completion Date'
    
    def display_certificate(self, obj):
        """Display certificate preview in admin"""
        if obj.is_completed:
            context = obj.get_certificate_context()
            return f"""
                <div style="padding: 1rem; background: #f5f5f5; border-radius: 8px;">
                    <strong>{context['fullName']}</strong><br/>
                    <small>{context['programTitle']}</small><br/>
                    <small>Certificate ID: {context['certificateId']}</small><br/>
                    <small>Completed: {context['completionDate']}</small>
                </div>
            """
        return "—"
    display_certificate.short_description = 'Certificate Preview'
    
    actions = ['mark_as_completed']
    
    def mark_as_completed(self, request, queryset):
        """Admin action to mark onboarding as complete"""
        count = 0
        for profile in queryset:
            if profile.mark_as_completed():
                count += 1
        self.message_user(request, f'{count} profile(s) marked as completed.')
    mark_as_completed.short_description = "Mark selected as completed"


# ============================================================================
# SIGNALS: Auto-generate certificate on completion
# ============================================================================

"""
Add to app/signals.py:

from django.db.models.signals import post_save
from django.dispatch import receiver
from app.models import OnboardingProfile


@receiver(post_save, sender=OnboardingProfile)
def on_onboarding_completed(sender, instance, created, **kwargs):
    '''Trigger actions when onboarding is marked complete'''
    if instance.is_completed and not created:
        # Send completion email
        # Log analytics event
        # Trigger notifications
        # etc.
        pass


Add to app/apps.py:

class AppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'app'
    
    def ready(self):
        import app.signals  # Import signals when app is ready
"""


# ============================================================================
# MANAGEMENT COMMAND: Generate missing certificates
# ============================================================================

"""
Add to app/management/commands/generate_certificate_ids.py:

from django.core.management.base import BaseCommand
from app.models import OnboardingProfile
from datetime import datetime


class Command(BaseCommand):
    help = 'Generate certificate IDs for completed onboarding without certificates'
    
    def handle(self, *args, **options):
        profiles = OnboardingProfile.objects.filter(
            is_completed=True,
            certificate_id__isnull=True
        )
        
        count = 0
        for profile in profiles:
            year = profile.completed_at.year
            profile.certificate_id = f'OB-{year}-{profile.user.id:05d}'
            profile.save()
            count += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'Generated {count} certificate IDs')
        )


Run with: python manage.py generate_certificate_ids
"""


# ============================================================================
# TESTS: Unit tests for certification views
# ============================================================================

"""
Add to app/tests.py:

from django.test import TestCase, Client
from django.contrib.auth.models import User
from app.models import OnboardingProfile
import json


class CertificationPanelTestCase(TestCase):
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            first_name='Test',
            last_name='User'
        )
        self.profile = OnboardingProfile.objects.create(user=self.user)
    
    def test_profile_data_not_completed(self):
        '''Test profile data endpoint before onboarding completion'''
        self.client.force_login(self.user)
        response = self.client.get('/portal-onboarding/profile-data/')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['is_completed'], False)
        self.assertIsNone(data['certificate'])
    
    def test_profile_data_completed(self):
        '''Test profile data endpoint after onboarding completion'''
        self.profile.mark_as_completed()
        self.client.force_login(self.user)
        response = self.client.get('/portal-onboarding/profile-data/')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['is_completed'], True)
        self.assertIsNotNone(data['certificate'])
        self.assertIn('fullName', data['certificate'])
    
    def test_mark_onboarding_complete(self):
        '''Test marking onboarding as complete'''
        self.client.force_login(self.user)
        response = self.client.post('/portal-onboarding/complete/')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertTrue(data['success'])
        
        # Verify completion in database
        self.profile.refresh_from_db()
        self.assertTrue(self.profile.is_completed)
        self.assertIsNotNone(self.profile.certificate_id)
"""
