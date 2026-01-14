from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from fleet.models import Bus
from passengers.models import Passenger
from trips.models import TripBus


class PassengerSerializer(serializers.ModelSerializer):
    original_bus_bus_id = serializers.PrimaryKeyRelatedField(
        queryset=Bus.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
        help_text="Bus id to set as original bus; will auto-create trip bus if needed.",
    )

    class Meta:
        model = Passenger
        fields = [
            "id",
            "trip",
            "original_bus",
            "original_bus_bus_id",
            "name",
            "phone",
            "note",
            "created_at",
            "updated_at",
        ]

    def _resolve_trip_bus(self, trip, original_bus, bus):
        if original_bus:
            return original_bus
        if bus:
            existing = TripBus.objects.filter(trip=trip, bus=bus).first()
            if existing:
                return existing
            manager = getattr(self.context.get("request"), "user", None)
            if not manager:
                raise ValidationError("Cannot assign bus without authenticated user")
            return TripBus.objects.create(
                trip=trip,
                bus=bus,
                manager=manager,
                driver_name="Auto",
                driver_tel="N/A",
                tour_guide_name="",
                tour_guide_tel="",
                description="Auto-created for passenger",
            )
        return None

    def create(self, validated_data):
        bus = validated_data.pop("original_bus_bus_id", None)
        original_bus = validated_data.get("original_bus")
        trip = validated_data.get("trip")
        validated_data["original_bus"] = self._resolve_trip_bus(trip, original_bus, bus)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        bus = validated_data.pop("original_bus_bus_id", None)
        original_bus = validated_data.get("original_bus", instance.original_bus)
        trip = validated_data.get("trip", instance.trip)
        validated_data["original_bus"] = self._resolve_trip_bus(trip, original_bus, bus)
        return super().update(instance, validated_data)
