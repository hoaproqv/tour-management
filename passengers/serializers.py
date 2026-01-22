from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from passengers.models import Passenger, PassengerBusAssignment, PassengerTransfer


class PassengerSerializer(serializers.ModelSerializer):
    assigned_trip_bus = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Passenger
        fields = [
            "id",
            "trip",
            "assigned_trip_bus",
            "name",
            "phone",
            "note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["assigned_trip_bus", "created_at", "updated_at"]

    def get_assigned_trip_bus(self, obj: Passenger):
        qs = getattr(obj, "bus_assignments", None)
        if qs is None:
            return None
        assignment = qs.filter(trip_id=obj.trip_id).order_by("-updated_at").first()
        return assignment.trip_bus_id if assignment else None


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


class PassengerAssignmentSerializer(serializers.ModelSerializer):
    trip = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = PassengerBusAssignment
        fields = [
            "id",
            "passenger",
            "trip",
            "trip_bus",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["trip", "created_at", "updated_at"]

    def get_trip(self, obj: PassengerBusAssignment):
        return obj.trip_id

    def validate(self, attrs):
        passenger = attrs.get("passenger") or getattr(self.instance, "passenger", None)
        trip_bus = attrs.get("trip_bus") or getattr(self.instance, "trip_bus", None)

        if not passenger or not trip_bus:
            return attrs

        if passenger.trip_id != trip_bus.trip_id:
            raise ValidationError("Passenger and trip bus must belong to the same trip")

        attrs["trip"] = passenger.trip
        return attrs

    def create(self, validated_data):
        passenger = validated_data["passenger"]
        defaults = {
            "trip_bus": validated_data["trip_bus"],
            "trip": validated_data.get("trip") or passenger.trip,
        }
        instance, _ = PassengerBusAssignment.objects.update_or_create(
            passenger=passenger,
            trip=defaults["trip"],
            defaults=defaults,
        )
        return instance

    def update(self, instance, validated_data):
        instance.trip_bus = validated_data.get("trip_bus", instance.trip_bus)
        instance.trip = validated_data.get("trip", instance.trip)
        instance.save()
        return instance
