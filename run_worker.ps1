$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

if (-not $env:CELERY_BROKER_URL) {
    $env:CELERY_BROKER_URL = "redis://127.0.0.1:6379/0"
}

if (-not $env:CELERY_RESULT_BACKEND) {
    $env:CELERY_RESULT_BACKEND = $env:CELERY_BROKER_URL
}

python -m celery -A Inner_Sparc_Portal worker --loglevel=info -P solo -c 1 -n worker1@%h
