from django.contrib import admin

from passengers import models


@admin.register(models.Passenger)
class PassengerAdmin(admin.ModelAdmin):
    list_display = ("name", "trip", "assigned_bus", "phone")
    list_filter = ("trip",)
    search_fields = ("name", "phone")
    raw_id_fields = ("trip",)

    def assigned_bus(self, obj):
        qs = getattr(obj, "bus_assignments", None)
        if qs is None:
            return None
        assignment = qs.filter(trip=obj.trip).order_by("-updated_at").first()
        return assignment.trip_bus if assignment else None

    assigned_bus.short_description = "Trip bus"


@admin.register(models.PassengerBusAssignment)
class PassengerBusAssignmentAdmin(admin.ModelAdmin):
    list_display = ("passenger", "trip", "trip_bus", "created_at")
    list_filter = ("trip",)
    raw_id_fields = ("passenger", "trip", "trip_bus")
