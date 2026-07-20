#!/usr/bin/env bash
set -o errexit
pip install -r requirements.txt
pip install gunicorn whitenoise dj-database-url psycopg2-binary
python manage.py collectstatic --no-input
python manage.py migrate
