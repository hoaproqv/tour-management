from rest_framework.routers import DefaultRouter

from passengers.views import PassengerViewSet

router = DefaultRouter()
router.register(r"passengers", PassengerViewSet, basename="passenger")

urlpatterns = router.urls
