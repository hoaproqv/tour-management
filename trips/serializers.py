from rest_framework import serializers

from trips.models import Trip, TripBus


class TripSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = [
            "id",
            "tenant",
            "name",
            "start_date",
            "end_date",
            "status",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["tenant"]


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
