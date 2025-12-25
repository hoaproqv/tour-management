from rest_framework import serializers

from fleet.models import Bus


class BusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bus
        fields = ["id", "registration_number", "bus_code", "capacity", "description", "created_at", "updated_at"]
