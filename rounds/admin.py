from django.contrib import admin

from rounds import models


@admin.register(models.Round)
class RoundAdmin(admin.ModelAdmin):
    list_display = ("trip", "name", "sequence", "status", "estimate_time")
    list_filter = ("trip", "status")
    search_fields = ("name", "location")
    raw_id_fields = ("trip",)


@admin.register(models.RoundBus)
class RoundBusAdmin(admin.ModelAdmin):
    list_display = ("round", "trip_bus", "created_at")
    list_filter = ("round", "trip_bus")
    raw_id_fields = ("round", "trip_bus")
