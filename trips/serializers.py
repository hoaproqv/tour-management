from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from accounts.models import Tenant
from fleet.models import Bus
from trips.models import Trip, TripBus


class TripSerializer(serializers.ModelSerializer):
    tenant_id = serializers.PrimaryKeyRelatedField(
        source="tenant",
        queryset=Tenant.objects.all(),
        write_only=True,
        required=False,
        help_text="Tenant to create the trip under (required for users without a tenant)",
    )
    bus_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Bus.objects.all(),
        required=False,
        write_only=True,
        help_text="List of bus IDs to attach to this trip",
    )
    buses = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Trip
        fields = [
            "id",
            "tenant",
            "tenant_id",
            "bus_ids",
            "buses",
            "name",
            "start_date",
            "end_date",
            "status",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["tenant"]

    def _sync_trip_buses(self, trip: Trip, bus_ids: list[int]) -> None:
        # Remove buses no longer attached
        current_bus_ids = set(
            TripBus.objects.filter(trip=trip).values_list("bus_id", flat=True)
        )
        desired_bus_ids = set(bus_ids)

        to_remove = current_bus_ids - desired_bus_ids
        if to_remove:
            TripBus.objects.filter(trip=trip, bus_id__in=to_remove).delete()

        to_add = desired_bus_ids - current_bus_ids
        if not to_add:
            return

        request = self.context.get("request") if self.context else None
        user = getattr(request, "user", None)
        if user is None:
            raise ValidationError("Cannot attach buses without an authenticated user.")
        defaults = {
            "manager": user,
            "driver_name": "",
            "driver_tel": "",
            "tour_guide_name": "",
            "tour_guide_tel": "",
            "description": "",
        }

        for bus_id in to_add:
            TripBus.objects.get_or_create(trip=trip, bus_id=bus_id, defaults=defaults)

    def create(self, validated_data):
        bus_ids = validated_data.pop("bus_ids", [])
        trip = super().create(validated_data)

        if bus_ids:
            bus_id_list = [bus.pk for bus in bus_ids]
            self._sync_trip_buses(trip, bus_id_list)

        return trip

    def update(self, instance, validated_data):
        bus_ids = validated_data.pop("bus_ids", None)
        trip = super().update(instance, validated_data)

        if bus_ids is not None:
            bus_id_list = [bus.pk for bus in bus_ids]
            self._sync_trip_buses(trip, bus_id_list)

        return trip

    def get_buses(self, obj: Trip):
        return list(obj.trip_buses.values_list("bus_id", flat=True))


class TripBusSerializer(serializers.ModelSerializer):
    class Meta:
        model = TripBus
        fields = [
            "id",
            "manager",
            "bus",
            "trip",
            "driver_name",
            "driver_tel",
            "tour_guide_name",
            "tour_guide_tel",
            "description",
            "created_at",
            "updated_at",
        ]
