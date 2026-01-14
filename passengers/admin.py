from django.contrib import admin

from passengers import models


@admin.register(models.Passenger)
class PassengerAdmin(admin.ModelAdmin):
    list_display = ("name", "trip", "original_bus", "phone")
    list_filter = ("trip",)
    search_fields = ("name", "phone")
    raw_id_fields = ("trip", "original_bus")
