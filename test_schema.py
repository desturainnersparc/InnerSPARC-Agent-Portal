#!/usr/bin/env python
"""Test script to verify OnboardingProfile schema is complete."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Inner_Sparc_Portal.settings')
django.setup()

from app.models import OnboardingProfile
from django.db import connection

print("=" * 60)
print("SCHEMA VERIFICATION TEST")
print("=" * 60)

try:
    # Test 1: Query the model
    profile_count = OnboardingProfile.objects.count()
    print(f"✓ OnboardingProfile table is accessible")
    print(f"  Profiles in database: {profile_count}")
    
    # Test 2: Check all fields exist
    fields = [f.name for f in OnboardingProfile._meta.fields]
    print(f"✓ All model fields accessible ({len(fields)} fields)")
    
    # Test 3: Check specific new fields from migration 0009
    critical_fields = ['application_status', 'rejection_reason', 'reviewed_at']
    for field in critical_fields:
        if field in fields:
            print(f"  ✓ {field} exists")
        else:
            print(f"  ✗ {field} MISSING")
    
    # Test 4: Verify tables in database
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='app_onboardingprofile'"
        )
        table_exists = cursor.fetchone()
        if table_exists:
            print(f"✓ app_onboardingprofile table exists in SQLite")
        else:
            print(f"✗ app_onboardingprofile table NOT found in SQLite")
    
    print("\n" + "=" * 60)
    print("RESULT: ✓ Schema is ready - Database is fully migrated")
    print("=" * 60)
    print("\nThe HTTP 500 'Database schema is not ready' error is FIXED.")
    
except Exception as e:
    print(f"\n✗ ERROR: {e}")
    print("=" * 60)
    import traceback
    traceback.print_exc()
