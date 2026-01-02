from rest_framework import serializers

from rounds.models import Round, RoundBus


class RoundSerializer(serializers.ModelSerializer):
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
