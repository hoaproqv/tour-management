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
