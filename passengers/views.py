from rest_framework import permissions

from common.viewsets import CachedModelViewSet
from passengers.models import Passenger
from passengers.serializers import PassengerSerializer


class PassengerViewSet(CachedModelViewSet):
    serializer_class = PassengerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Passenger.objects.select_related("trip", "original_bus")
        user = self.request.user
        if getattr(user, "tenant_id", None):
            qs = qs.filter(trip__tenant_id=user.tenant_id)
        return qs
