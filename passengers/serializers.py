from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from passengers.models import ImportedBus, Passenger, PassengerBusAssignment, PassengerTransfer


class PassengerSerializer(serializers.ModelSerializer):
    assigned_trip_bus = serializers.SerializerMethodField(read_only=True)
    trips = serializers.SerializerMethodField(read_only=True)
    trip_id = serializers.IntegerField(write_only=True, required=False)
    trip_bus_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Passenger
        fields = [
            "id",
            "assigned_trip_bus",
            "name",
            "phone",
            "extra_info",
            "note",
            "trips",
            "created_at",
            "updated_at",
            "trip_id",
            "trip_bus_id",
        ]
        read_only_fields = ["assigned_trip_bus", "trips", "created_at", "updated_at"]

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

    def get_trips(self, obj: Passenger):
        qs = getattr(obj, "all_assignments", None)
        if qs is None:
            qs = getattr(obj, "bus_assignments", None)
            if qs is None:
                return []
        
        seen = set()
        result = []
        for a in qs.all() if hasattr(qs, "all") else qs:
            if getattr(a, "trip", None) and a.trip.id not in seen:
                seen.add(a.trip.id)
                result.append({"id": str(a.trip.id), "name": a.trip.name})
        return result

    def create(self, validated_data):
        tenant = self.context.get("tenant")
        trip_id = validated_data.pop("trip_id", None)
        trip_bus_id = validated_data.pop("trip_bus_id", None)

        if not trip_id:
            raise ValidationError({"trip_id": "Chuyến đi là bắt buộc."})

        from trips.models import Trip, TripBus
        try:
            trip = Trip.objects.get(id=trip_id, tenant=tenant)
        except Trip.DoesNotExist:
            raise ValidationError({"trip_id": "Chuyến đi không tồn tại."})

        trip_bus = None
        if trip_bus_id:
            try:
                trip_bus = TripBus.objects.get(id=trip_bus_id, trip=trip)
            except TripBus.DoesNotExist:
                raise ValidationError({"trip_bus_id": "Xe khách không hợp lệ cho chuyến đi này."})

        if tenant:
            validated_data["tenant"] = tenant
            
        passenger = super().create(validated_data)
        
        PassengerBusAssignment.objects.create(
            passenger=passenger,
            trip=trip,
            trip_bus=trip_bus
        )
        return passenger

    def update(self, instance, validated_data):
        tenant = self.context.get("tenant")
        trip_id = validated_data.pop("trip_id", None)
        trip_bus_id = validated_data.pop("trip_bus_id", None)

        passenger = super().update(instance, validated_data)

        if trip_id:
            from trips.models import Trip, TripBus
            try:
                trip = Trip.objects.get(id=trip_id, tenant=tenant)
                
                trip_bus = None
                if trip_bus_id:
                    try:
                        trip_bus = TripBus.objects.get(id=trip_bus_id, trip=trip)
                    except TripBus.DoesNotExist:
                        raise ValidationError({"trip_bus_id": "Xe khách không hợp lệ cho chuyến đi này."})
                elif "trip_bus_id" in self.initial_data and self.initial_data.get("trip_bus_id") in ["", None]:
                    # They explicitly unassigned
                    trip_bus = None
                else:
                    # Not provided, maybe we don't update it, or we do?
                    # The form sends trip_bus_id as undefined if not selected, but initial_data might not have it.
                    pass

                # If trip_bus_id is in initial_data, update the assignment
                if "trip_bus_id" in self.initial_data:
                    PassengerBusAssignment.objects.update_or_create(
                        passenger=passenger,
                        trip=trip,
                        defaults={"trip_bus": trip_bus}
                    )
            except Trip.DoesNotExist:
                pass # Ignore if trip doesn't exist on update

        return passenger


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
            "imported_bus",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["trip", "created_at", "updated_at"]

    def get_trip(self, obj: PassengerBusAssignment):
        return obj.trip_id

    def validate(self, attrs):
        passenger = attrs.get("passenger") or getattr(self.instance, "passenger", None)
        trip_bus = attrs.get("trip_bus") or getattr(self.instance, "trip_bus", None)

        if not passenger:
            return attrs

        if trip_bus:
            trip = trip_bus.trip
            if passenger.tenant_id != trip.tenant_id:
                raise ValidationError("Passenger and trip must belong to the same tenant")
            attrs["trip"] = trip

        return attrs

    def create(self, validated_data):
        passenger = validated_data["passenger"]
        trip_bus = validated_data.get("trip_bus")
        imported_bus = validated_data.get("imported_bus")
        trip = validated_data.get("trip")
        if not trip:
            if trip_bus:
                trip = trip_bus.trip
            elif imported_bus:
                trip = imported_bus.trip
        if not trip:
            raise ValidationError("Cannot determine trip from provided data.")
        validated_data["trip"] = trip
        defaults = {k: v for k, v in validated_data.items() if k != "passenger"}
        instance, _ = PassengerBusAssignment.objects.update_or_create(
            passenger=passenger,
            trip=trip,
            defaults=defaults,
        )
        return instance

    def update(self, instance, validated_data):
        instance.trip_bus = validated_data.get("trip_bus", instance.trip_bus)
        instance.imported_bus = validated_data.get("imported_bus", instance.imported_bus)
        if instance.trip_bus:
            instance.trip = instance.trip_bus.trip
        instance.save()
        return instance


class ImportedBusSerializer(serializers.ModelSerializer):
    passenger_count = serializers.SerializerMethodField(read_only=True)
    is_mapped = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ImportedBus
        fields = [
            "id",
            "trip",
            "sheet_name",
            "sequence",
            "mapped_bus",
            "mapped_trip_bus",
            "passenger_count",
            "is_mapped",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["mapped_trip_bus", "passenger_count", "is_mapped", "created_at", "updated_at"]

    def get_passenger_count(self, obj: ImportedBus):
        return obj.passenger_assignments.count()

    def get_is_mapped(self, obj: ImportedBus):
        return obj.mapped_bus_id is not None
