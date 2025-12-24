from django.contrib import admin

from trips import models


@admin.register(models.Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "start_date", "end_date", "status")
    list_filter = ("tenant", "status")
    search_fields = ("name", "description")
    raw_id_fields = ("tenant",)


@admin.register(models.TripBus)
class TripBusAdmin(admin.ModelAdmin):
    list_display = (
        "trip",
        "bus",
        "manager",
        "driver_name",
        "tour_guide_name",
    )
    list_filter = ("trip", "bus")
    search_fields = ("driver_name", "tour_guide_name")
    raw_id_fields = ("trip", "bus", "manager")
