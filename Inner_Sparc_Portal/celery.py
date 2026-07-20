import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "Inner_Sparc_Portal.settings")

app = Celery("Inner_Sparc_Portal")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
