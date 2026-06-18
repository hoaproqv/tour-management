from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from accounts.models import Tenant
from fleet.models import Bus
from trips.models import Trip, TripBus


class TripBusAssignmentSerializer(serializers.Serializer):
    bus = serializers.PrimaryKeyRelatedField(queryset=Bus.objects.all())
    manager = serializers.PrimaryKeyRelatedField(
        queryset=get_user_model().objects.none(),
        required=True,
        help_text="User id of fleet lead",
    )
    driver = serializers.PrimaryKeyRelatedField(
        queryset=get_user_model().objects.none(),
        required=True,
        help_text="User id of driver",
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        User = self.context.get("UserModel") or get_user_model()
        self.fields["manager"].queryset = User.objects.select_related("role")
        self.fields["driver"].queryset = User.objects.select_related("role")

    def validate_manager(self, user):
        role_name = (getattr(getattr(user, "role", None), "name", "") or "").lower()
        if role_name not in {"fleet_lead", "admin", "tour_manager"} and not (
            user.is_staff or user.is_superuser
        ):
            raise ValidationError("Manager must be fleet_lead or admin-level user")
        return user

    def validate_driver(self, user):
        role_name = (getattr(getattr(user, "role", None), "name", "") or "").lower()
        if role_name not in {"driver"} and not user.is_staff and not user.is_superuser:
            raise ValidationError("Driver must have role 'driver'")
        return user


class TripSerializer(serializers.ModelSerializer):
    tenant_id = serializers.PrimaryKeyRelatedField(
        source="tenant",
        queryset=Tenant.objects.all(),
        write_only=True,
        required=False,
        help_text="Tenant to create the trip under (required for users without a tenant)",
    )
    bus_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Bus.objects.all(),
        required=False,
        write_only=True,
        help_text="List of bus IDs to attach to this trip (legacy)",
    )
    bus_assignments = TripBusAssignmentSerializer(
        many=True,
        required=False,
        write_only=True,
    )
    buses = serializers.SerializerMethodField(read_only=True)
    trip_buses = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Trip
        fields = [
            "id",
            "tenant",
            "tenant_id",
            "bus_ids",
            "bus_assignments",
            "buses",
            "trip_buses",
            "name",
            "start_date",
            "end_date",
            "status",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["tenant"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        User = get_user_model()
        # Wire user querysets into nested assignment serializer
        bus_assign_field = self.fields.get("bus_assignments")
        if bus_assign_field is not None and hasattr(bus_assign_field, "child"):
            child = bus_assign_field.child
            child.context.update({"UserModel": User})
            child.fields["manager"].queryset = User.objects.select_related("role")
            child.fields["driver"].queryset = User.objects.select_related("role")

    def _sync_trip_buses(self, trip: Trip, assignments: list[dict]) -> None:
        # Remove buses no longer attached
        current_bus_ids = set(
            TripBus.objects.filter(trip=trip).values_list("bus_id", flat=True)
        )
        desired_bus_ids = {item["bus"].id for item in assignments}

        to_remove = current_bus_ids - desired_bus_ids
        if to_remove:
            TripBus.objects.filter(trip=trip, bus_id__in=to_remove).delete()

        assignment_map = {item["bus"].id: item for item in assignments}

        for trip_bus in TripBus.objects.filter(trip=trip, bus_id__in=desired_bus_ids):
            assignment = assignment_map.get(trip_bus.bus_id)
            if assignment is None:
                continue
            trip_bus.manager = assignment["manager"]
            trip_bus.driver = assignment["driver"]
            # Keep legacy fields in sync for driver name/tel if available
            trip_bus.driver_name = assignment["driver"].name
            trip_bus.save(update_fields=["manager", "driver", "driver_name"])

        to_add = desired_bus_ids - current_bus_ids
        for bus_id in to_add:
            assignment = assignment_map[bus_id]
            TripBus.objects.get_or_create(
                trip=trip,
                bus_id=bus_id,
                defaults={
                    "manager": assignment["manager"],
                    "driver": assignment["driver"],
                    "driver_name": assignment["driver"].name,
                    "driver_tel": "",
                    "tour_guide_name": "",
                    "tour_guide_tel": "",
                    "description": "",
                },
            )

    def create(self, validated_data):
        bus_assignments = validated_data.pop("bus_assignments", [])
        bus_ids = validated_data.pop("bus_ids", [])
        trip = super().create(validated_data)
        if bus_ids and not bus_assignments:
            raise ValidationError(
                "Vui lòng cung cấp bus_assignments gồm bus, trưởng xe và lái xe cho từng bus",
            )
        if bus_assignments:
            self._sync_trip_buses(trip, bus_assignments)

        return trip

    def update(self, instance, validated_data):
        bus_assignments = validated_data.pop("bus_assignments", None)
        bus_ids = validated_data.pop("bus_ids", None)
        trip = super().update(instance, validated_data)
        if bus_assignments is not None:
            self._sync_trip_buses(trip, bus_assignments)
        elif bus_ids is not None:
            raise ValidationError(
                "Vui lòng gửi bus_assignments để gán trưởng xe và lái xe cho từng bus",
            )

        return trip

    def get_buses(self, obj: Trip):
        return list(obj.trip_buses.values_list("bus_id", flat=True))

    def get_trip_buses(self, obj: Trip):
        return TripBusSerializer(obj.trip_buses.all(), many=True).data

    def validate(self, attrs):
        assignments = attrs.get("bus_assignments")
        if assignments:
            bus_ids = [a["bus"].id for a in assignments]
            if len(bus_ids) != len(set(bus_ids)):
                raise ValidationError("Mỗi bus chỉ được gán một lần trong trip")
            manager_ids = [a["manager"].id for a in assignments]
            driver_ids = [a["driver"].id for a in assignments]
            if len(manager_ids) != len(set(manager_ids)):
                raise ValidationError(
                    "Mỗi trưởng xe chỉ được gán cho một bus trong trip"
                )
            if len(driver_ids) != len(set(driver_ids)):
                raise ValidationError("Mỗi lái xe chỉ được gán cho một bus trong trip")

            # Check conflicts with existing trip buses (same trip, other buses)
            trip = getattr(self, "instance", None)
            if trip:
                bus_ids_in_payload = {a["bus"].id for a in assignments}
                manager_conflicts = TripBus.objects.filter(
                    trip=trip,
                    manager_id__in=manager_ids,
                ).exclude(bus_id__in=bus_ids_in_payload)
                if manager_conflicts.exists():
                    raise ValidationError(
                        "Trưởng xe đã được gán cho bus khác trong trip",
                    )

                driver_conflicts = TripBus.objects.filter(
                    trip=trip,
                    driver_id__in=driver_ids,
                ).exclude(bus_id__in=bus_ids_in_payload)
                if driver_conflicts.exists():
                    raise ValidationError(
                        "Lái xe đã được gán cho bus khác trong trip",
                    )
        return super().validate(attrs)


class TripBusSerializer(serializers.ModelSerializer):
    registration_number = serializers.CharField(max_length=50, required=False)
    bus_code = serializers.CharField(max_length=50, required=False)
    capacity = serializers.IntegerField(required=False, min_value=1, max_value=100)
    bus = serializers.PrimaryKeyRelatedField(queryset=Bus.objects.all(), required=False)
    driver_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    driver_tel = serializers.CharField(max_length=30, required=False, allow_blank=True)

    class Meta:
        model = TripBus
        fields = [
            "id",
            "manager",
            "driver",
            "bus",
            "trip",
            "driver_name",
            "driver_tel",
            "tour_guide_name",
            "tour_guide_tel",
            "description",
            "registration_number",
            "bus_code",
            "capacity",
            "created_at",
            "updated_at",
        ]
        validators = []  # Disable implicit UniqueTogetherValidator because bus is computed in validate()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.bus:
            data["registration_number"] = instance.bus.registration_number
            data["bus_code"] = instance.bus.bus_code
            data["capacity"] = instance.bus.capacity
        if instance.manager:
            data["manager_name"] = instance.manager.name or instance.manager.email
            data["manager_tel"] = instance.manager.phone or ""
        if instance.driver:
            data["driver_name"] = instance.driver.name or instance.driver.email
            data["driver_tel"] = instance.driver.phone or ""
        return data

    def validate(self, attrs):
        trip = attrs.get("trip")
        if not trip and self.instance:
            trip = self.instance.trip

        # Handle Bus Creation/Lookup for both create and update
        reg_num = attrs.get("registration_number")
        b_code = attrs.get("bus_code")
        cap = attrs.get("capacity")

        if "registration_number" in attrs and reg_num:
            bus, created = Bus.objects.get_or_create(
                registration_number=reg_num,
                defaults={
                    "bus_code": b_code or reg_num,
                    "capacity": cap or 45,
                    "tenant_id": trip.tenant_id if trip else None
                }
            )
            # If the bus exists but we provided new capacity/bus_code, we can optionally update it
            if not created:
                changed = False
                if b_code and bus.bus_code != b_code:
                    bus.bus_code = b_code
                    changed = True
                if cap is not None and bus.capacity != cap:
                    bus.capacity = cap
                    changed = True
                if changed:
                    bus.save(update_fields=["bus_code", "capacity"])

            attrs["bus"] = bus
        elif not attrs.get("bus") and not self.instance:
            raise ValidationError("Must provide bus or registration_number.")

        # Pop write-only bus fields from attrs so they don't get passed to TripBus creation
        attrs.pop("registration_number", None)
        attrs.pop("bus_code", None)
        attrs.pop("capacity", None)

        manager = attrs.get("manager")
        if "manager" not in attrs and self.instance:
            manager = self.instance.manager

        driver = attrs.get("driver")
        if "driver" not in attrs and self.instance:
            driver = self.instance.driver

        if driver:
            if not attrs.get("driver_name"):
                attrs["driver_name"] = driver.name or driver.email or ""
            if not attrs.get("driver_tel"):
                attrs["driver_tel"] = getattr(driver, "phone", "") or ""

        if trip:
            qs = TripBus.objects.filter(trip=trip)
            if self.instance:
                qs = qs.exclude(id=self.instance.id)

            if attrs.get("bus") and qs.filter(bus=attrs["bus"]).exists():
                raise ValidationError(
                    {"registration_number": "Xe này (biển số) đã được thêm vào chuyến đi này."}
                )

            if manager and qs.filter(manager=manager).exists():
                raise ValidationError(
                    {"manager": "Trưởng xe đã được gán cho xe khác trong chuyến đi này."}
                )
            if manager and manager.tenant_id != trip.tenant_id:
                raise ValidationError(
                    {"manager": "Trưởng xe phải thuộc cùng tenant với chuyến đi."}
                )

            if driver and qs.filter(driver=driver).exists():
                raise ValidationError(
                    {"driver": "Lái xe đã được gán cho xe khác trong chuyến đi này."}
                )
            if driver and driver.tenant_id != trip.tenant_id:
                raise ValidationError(
                    {"driver": "Lái xe phải thuộc cùng tenant với chuyến đi."}
                )

        return super().validate(attrs)
