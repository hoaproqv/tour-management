from rest_framework import serializers

from passengers.models import Passenger


class PassengerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Passenger
        fields = [
            "id",
            "trip",
            "original_bus",
            "name",
            "phone",
            "seat_number",
            "note",
            "created_at",
            "updated_at",
        ]
