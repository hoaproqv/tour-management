from rest_framework.routers import DefaultRouter

from trips.views import TripBusViewSet, TripViewSet

router = DefaultRouter()
router.register(r"trips", TripViewSet, basename="trip")
router.register(r"trip-buses", TripBusViewSet, basename="tripbus")

urlpatterns = router.urls
