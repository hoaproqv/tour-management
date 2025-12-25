from rest_framework.routers import DefaultRouter

from fleet.views import BusViewSet

router = DefaultRouter()
router.register(r"buses", BusViewSet, basename="bus")

urlpatterns = router.urls
