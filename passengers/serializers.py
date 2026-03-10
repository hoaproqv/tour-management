from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from passengers.models import Passenger, PassengerBusAssignment, PassengerTransfer


class PassengerSerializer(serializers.ModelSerializer):
    assigned_trip_bus = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Passenger
        fields = [
            "id",
            "assigned_trip_bus",
            "name",
            "phone",
            "note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["assigned_trip_bus", "created_at", "updated_at"]

    def get_assigned_trip_bus(self, obj: Passenger):
        trip_id = self.context.get("trip_id")
        qs = getattr(obj, "bus_assignments", None)
        if qs is None:
            return None
        filtered_qs = qs
        if trip_id:
            filtered_qs = filtered_qs.filter(trip_id=trip_id)

        assignment = filtered_qs.order_by("-updated_at").first()
        if not assignment:
            assignment = qs.order_by("-updated_at").first()
        return assignment.trip_bus_id if assignment else None

    def create(self, validated_data):
        tenant = self.context.get("tenant")
        if tenant:
            validated_data["tenant"] = tenant
        return super().create(validated_data)


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

        if not to_trip_bus:
            raise ValidationError("Target bus is required")

        if (
            to_trip_bus
            and from_trip_bus
            and to_trip_bus.trip_id != from_trip_bus.trip_id
        ):
            raise ValidationError(
                "Source and target buses must belong to the same trip"
            )

        trip = (
            to_trip_bus.trip
            if to_trip_bus
            else from_trip_bus.trip if from_trip_bus else None
        )

        if passenger and trip and passenger.tenant_id != trip.tenant_id:
            raise ValidationError("Passenger and trip must belong to the same tenant")

        if trip:
            attrs["trip"] = trip

        return attrs

    def get_trip(self, obj: PassengerTransfer):
        return obj.trip_id

    def create(self, validated_data):
        passenger = validated_data["passenger"]
        defaults = {
            "from_trip_bus": validated_data.get("from_trip_bus"),
            "to_trip_bus": validated_data.get("to_trip_bus"),
            "trip": validated_data.get("trip") or validated_data["to_trip_bus"].trip,
        }
        instance, _created = PassengerTransfer.objects.update_or_create(
            passenger=passenger,
            trip=defaults["trip"],
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

        trip = trip_bus.trip
        if passenger.tenant_id != trip.tenant_id:
            raise ValidationError("Passenger and trip must belong to the same tenant")

        attrs["trip"] = trip
        return attrs

    def create(self, validated_data):
        passenger = validated_data["passenger"]
        defaults = {
            "trip_bus": validated_data["trip_bus"],
            "trip": validated_data.get("trip") or validated_data["trip_bus"].trip,
        }
        instance, _ = PassengerBusAssignment.objects.update_or_create(
            passenger=passenger,
            trip=defaults["trip"],
            defaults=defaults,
        )
        return instance

    def update(self, instance, validated_data):
        instance.trip_bus = validated_data.get("trip_bus", instance.trip_bus)
        instance.trip = validated_data.get("trip", instance.trip_bus.trip)
        instance.save()
        return instance
