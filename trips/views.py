from rest_framework import permissions

from common.viewsets import CachedModelViewSet
from trips.models import Trip, TripBus
from trips.serializers import TripBusSerializer, TripSerializer


class TripViewSet(CachedModelViewSet):
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Trip.objects.all().select_related("tenant")
        user = self.request.user
        tenant_id = getattr(user, "tenant_id", None)
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        tenant = getattr(user, "tenant", None)
        if tenant is None:
            raise ValueError("User has no tenant assigned")
        serializer.save(tenant=tenant)
        super().perform_create(serializer)


class TripBusViewSet(CachedModelViewSet):
    serializer_class = TripBusSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = TripBus.objects.select_related("trip", "bus", "manager")
        user = self.request.user
        tenant_id = getattr(user, "tenant_id", None)
        if tenant_id:
            qs = qs.filter(trip__tenant_id=tenant_id)
        return qs
