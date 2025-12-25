from common.viewsets import CachedModelViewSet
from fleet.models import Bus
from fleet.serializers import BusSerializer


class BusViewSet(CachedModelViewSet):
    queryset = Bus.objects.all().order_by("registration_number")
    serializer_class = BusSerializer
