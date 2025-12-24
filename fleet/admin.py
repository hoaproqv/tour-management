from django.contrib import admin

from fleet import models


@admin.register(models.Bus)
class BusAdmin(admin.ModelAdmin):
    list_display = ("registration_number", "bus_code", "capacity", "created_at")
    search_fields = ("registration_number", "bus_code")
