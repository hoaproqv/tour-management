import logging

import redis
from django.conf import settings
from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["GET"])
def health_check(_request):
    """
    Health check endpoint for production monitoring
    """
    health_status = {
        "status": "healthy",
        "checks": {
            "database": False,
            "cache": False,
            "redis": False,
        },
        "version": "1.0.0",
        "environment": "production" if not settings.DEBUG else "development",
    }

    status_code = 200

    # Check database connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health_status["checks"]["database"] = True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        health_status["status"] = "unhealthy"
        status_code = 503

    # Check cache connection
    try:
        cache.set("health_check", "ok", 30)
        if cache.get("health_check") == "ok":
            health_status["checks"]["cache"] = True
    except Exception as e:
        logger.error(f"Cache health check failed: {e}")
        health_status["status"] = "unhealthy"
        status_code = 503

    # Check Redis connection (if configured)
    try:
        if hasattr(settings, "REDIS_HOST"):
            r = redis.Redis(
                host=settings.REDIS_HOST,
                port=getattr(settings, "REDIS_PORT", 6379),
                password=getattr(settings, "REDIS_PASSWORD", None),
                decode_responses=True,
            )
            r.ping()
            health_status["checks"]["redis"] = True
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        health_status["status"] = "unhealthy"
        status_code = 503

    return JsonResponse(health_status, status=status_code)
