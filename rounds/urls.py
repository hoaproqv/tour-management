from rest_framework.routers import DefaultRouter

from rounds.views import RoundBusViewSet, RoundViewSet

router = DefaultRouter()
router.register(r"rounds", RoundViewSet, basename="round")
router.register(r"round-buses", RoundBusViewSet, basename="roundbus")

urlpatterns = router.urls
