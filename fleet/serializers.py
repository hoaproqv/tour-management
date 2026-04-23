from rest_framework import serializers

from fleet.models import Bus


class BusSerializer(serializers.ModelSerializer):
    active_trip = serializers.SerializerMethodField(read_only=True)
    is_available = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Bus
        fields = [
            "id",
            "registration_number",
            "bus_code",
            "capacity",
            "description",
            "active_trip",
            "is_available",
            "created_at",
            "updated_at",
        ]

    def get_active_trip(self, obj: Bus):
        """Return the name of the active (non-done) trip this bus is assigned to, or None."""
        trip_bus = (
            obj.trip_buses
            .select_related("trip")
            .exclude(trip__status="done")
            .order_by("-trip__start_date")
            .first()
        )
        if trip_bus:
            return {
                "id": trip_bus.trip_id,
                "name": trip_bus.trip.name,
                "status": trip_bus.trip.status,
            }
        return None

    def get_is_available(self, obj: Bus) -> bool:
        """True if the bus is not currently in any active (non-done) trip."""
        return not obj.trip_buses.exclude(trip__status="done").exists()
