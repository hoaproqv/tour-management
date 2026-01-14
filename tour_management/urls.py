"""
URL configuration for tour_management project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from core.dashboard import DashboardOverviewAPIView
from core.health import health_check
from core.views import IndexPageAPIView
from tour_management.csrf import get_csrf_token

api_patterns = [
    path("csrf", get_csrf_token),
    path(
        "dashboard/overview/",
        DashboardOverviewAPIView.as_view(),
        name="dashboard-overview",
    ),
]

urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),
    # API schema and documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    # Health check endpoint
    path("health/", health_check, name="health_check"),
    path("", IndexPageAPIView.as_view(), name="index_page"),
    path("view/", include("core.urls")),
    path("api/", include(api_patterns)),
    path("api/", include("accounts.urls")),
    path("api/", include("fleet.urls")),
    path("api/", include("trips.urls")),
    path("api/", include("passengers.urls")),
    path("api/", include("rounds.urls")),
    path("api/", include("transactions.urls")),
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
