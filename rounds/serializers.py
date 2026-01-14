from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from fleet.models import Bus
from rounds.models import Round, RoundBus
from trips.models import TripBus


class RoundSerializer(serializers.ModelSerializer):
    bus_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        required=False,
        write_only=True,
        queryset=Bus.objects.all(),
        help_text="Bus IDs to attach to this round; defaults to the trip's buses",
    )
    buses = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Round
        fields = [
            "id",
            "trip",
            "name",
            "location",
            "sequence",
            "estimate_time",
            "actual_time",
            "status",
            "bus_ids",
            "buses",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        trip = attrs.get("trip") or getattr(self.instance, "trip", None)
        sequence = attrs.get("sequence") or getattr(self.instance, "sequence", None)
        if trip and sequence is not None:
            qs = Round.objects.filter(trip=trip, sequence=sequence)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"sequence": "Sequence must be unique per trip."}
                )
        return attrs

    def _resolve_trip_buses(self, trip, bus_ids, user):
        if user is None:
            raise ValidationError("Cannot attach buses without an authenticated user.")

        current_trip_bus_ids = set(
            TripBus.objects.filter(trip=trip).values_list("bus_id", flat=True)
        )

        # Ensure trip-bus records exist for all desired buses
        for bus_id in bus_ids:
            if bus_id not in current_trip_bus_ids:
                TripBus.objects.get_or_create(
                    trip=trip,
                    bus_id=bus_id,
                    defaults={
                        "manager": user,
                        "driver_name": "",
                        "driver_tel": "",
                        "tour_guide_name": "",
                        "tour_guide_tel": "",
                        "description": "Auto-attached for round",
                    },
                )

        # Re-read trip bus ids after potential creations
        trip_bus_map = dict(
            TripBus.objects.filter(trip=trip).values_list("bus_id", "id")
        )

        return [trip_bus_map[bus_id] for bus_id in bus_ids if bus_id in trip_bus_map]

    def _sync_round_buses(self, round_obj: Round, trip_bus_ids: list[int]):
        current_ids = set(
            RoundBus.objects.filter(round=round_obj).values_list(
                "trip_bus_id", flat=True
            )
        )
        desired_ids = set(trip_bus_ids)

        to_remove = current_ids - desired_ids
        if to_remove:
            RoundBus.objects.filter(round=round_obj, trip_bus_id__in=to_remove).delete()

        to_add = desired_ids - current_ids
        for trip_bus_id in to_add:
            RoundBus.objects.get_or_create(round=round_obj, trip_bus_id=trip_bus_id)

    def create(self, validated_data):
        request = self.context.get("request") if self.context else None
        user = getattr(request, "user", None)
        bus_ids = validated_data.pop("bus_ids", None)
        trip = validated_data.get("trip")

        if bus_ids is None:
            bus_ids = list(
                TripBus.objects.filter(trip=trip).values_list("bus_id", flat=True)
            )
        else:
            bus_ids = [bus.pk for bus in bus_ids]

        round_obj = super().create(validated_data)

        if bus_ids:
            trip_bus_ids = self._resolve_trip_buses(trip, bus_ids, user)
            self._sync_round_buses(round_obj, trip_bus_ids)

        return round_obj

    def update(self, instance, validated_data):
        request = self.context.get("request") if self.context else None
        user = getattr(request, "user", None)
        bus_ids = validated_data.pop("bus_ids", None)
        trip = validated_data.get("trip", instance.trip)

        round_obj = super().update(instance, validated_data)

        if bus_ids is not None:
            bus_ids = [bus.pk for bus in bus_ids]
            trip_bus_ids = self._resolve_trip_buses(trip, bus_ids, user)
            self._sync_round_buses(round_obj, trip_bus_ids)

        return round_obj

    def get_buses(self, obj: Round):
        return list(
            obj.round_buses.select_related("trip_bus").values_list(
                "trip_bus__bus_id", flat=True
            )
        )


class RoundBusSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoundBus
        fields = [
            "id",
            "trip_bus",
            "round",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        trip_bus = attrs.get("trip_bus") or getattr(self.instance, "trip_bus", None)
        round_obj = attrs.get("round") or getattr(self.instance, "round", None)
        if trip_bus and round_obj:
            qs = RoundBus.objects.filter(trip_bus=trip_bus, round=round_obj)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"non_field_errors": "This round is already assigned to the bus."}
                )
        return attrs
