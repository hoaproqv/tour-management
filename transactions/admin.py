from django.contrib import admin

from transactions import models


@admin.register(models.Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("passenger", "round_bus", "check_in", "check_out")
    list_filter = ("round_bus",)
    search_fields = ("passenger__name",)
    raw_id_fields = ("passenger", "round_bus")
