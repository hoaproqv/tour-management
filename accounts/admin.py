from django.contrib import admin

from accounts import models


@admin.register(models.Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("name", "created_at", "updated_at")
    search_fields = ("name",)


@admin.register(models.Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(models.User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("email", "name", "tenant", "role", "is_active", "is_staff")
    list_filter = ("tenant", "role", "is_active", "is_staff")
    search_fields = ("email", "name")
    raw_id_fields = ("tenant", "role")
