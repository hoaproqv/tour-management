from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from fleet.models import Bus
from passengers.models import Passenger, PassengerTransfer
from rounds.models import Round, RoundBus
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

    def _ensure_round_buses(self, trip, trip_bus):
        """Ensure round-bus rows exist for the given trip bus."""
        if not trip or not trip_bus:
            return
        round_ids = list(Round.objects.filter(trip=trip).values_list("id", flat=True))
        for round_id in round_ids:
            RoundBus.objects.get_or_create(round_id=round_id, trip_bus=trip_bus)

    def create(self, validated_data):
        bus = validated_data.pop("original_bus_bus_id", None)
        original_bus = validated_data.get("original_bus")
        trip = validated_data.get("trip")
        trip_bus = self._resolve_trip_bus(trip, original_bus, bus)
        validated_data["original_bus"] = trip_bus
        obj = super().create(validated_data)
        self._ensure_round_buses(trip, trip_bus)
        return obj

    def update(self, instance, validated_data):
        bus = validated_data.pop("original_bus_bus_id", None)
        original_bus = validated_data.get("original_bus", instance.original_bus)
        trip = validated_data.get("trip", instance.trip)
        trip_bus = self._resolve_trip_bus(trip, original_bus, bus)
        validated_data["original_bus"] = trip_bus
        obj = super().update(instance, validated_data)
        self._ensure_round_buses(trip, trip_bus)
        return obj


class PassengerTransferSerializer(serializers.ModelSerializer):
    trip = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = PassengerTransfer
        fields = [
            "id",
            "passenger",
            "from_trip_bus",
            "to_trip_bus",
            "trip",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        passenger = attrs.get("passenger") or getattr(self.instance, "passenger", None)
        to_trip_bus = attrs.get("to_trip_bus") or getattr(
            self.instance, "to_trip_bus", None
        )
        from_trip_bus = attrs.get("from_trip_bus") or getattr(
            self.instance, "from_trip_bus", None
        )

        if passenger and to_trip_bus and passenger.trip_id != to_trip_bus.trip_id:
            raise ValidationError(
                "Passenger and target bus must belong to the same trip"
            )

        if passenger and from_trip_bus and passenger.trip_id != from_trip_bus.trip_id:
            raise ValidationError(
                "Passenger and source bus must belong to the same trip"
            )

        return attrs

    def get_trip(self, obj: PassengerTransfer):
        return obj.passenger.trip_id

    def create(self, validated_data):
        passenger = validated_data["passenger"]
        defaults = {
            "from_trip_bus": validated_data.get("from_trip_bus"),
            "to_trip_bus": validated_data.get("to_trip_bus"),
        }
        instance, _created = PassengerTransfer.objects.update_or_create(
            passenger=passenger,
            defaults=defaults,
        )
        return instance
