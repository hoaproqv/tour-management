from rest_framework import permissions

from common.viewsets import CachedModelViewSet
from rounds.models import Round, RoundBus
from rounds.serializers import RoundBusSerializer, RoundSerializer


class RoundViewSet(CachedModelViewSet):
    serializer_class = RoundSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Round.objects.select_related("trip")
        user = self.request.user
        if getattr(user, "tenant_id", None):
            qs = qs.filter(trip__tenant_id=user.tenant_id)
        return qs


class RoundBusViewSet(CachedModelViewSet):
    serializer_class = RoundBusSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = RoundBus.objects.select_related("round", "trip_bus", "trip_bus__trip")
        user = self.request.user
        if getattr(user, "tenant_id", None):
            qs = qs.filter(trip_bus__trip__tenant_id=user.tenant_id)
        return qs
