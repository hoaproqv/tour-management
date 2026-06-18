from rest_framework import permissions


def get_role_name(user):
    if not user or not user.is_authenticated:
        return ""
    if hasattr(user, 'role') and user.role:
        return user.role.name
    return ""


class IsAdminOrTourManagerOrReadOnly(permissions.BasePermission):
    """
    Allow read-only for anyone, but write only for Admin or Tour Manager.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        role = get_role_name(request.user)
        return request.user.is_superuser or request.user.is_staff or role in ["admin", "tour_manager"]


class IsAdminOrTourManagerOrFleetLeadOrReadOnly(permissions.BasePermission):
    """
    Allow read-only for anyone.
    Write allowed for Admin, Tour Manager, and Fleet Lead.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        role = get_role_name(request.user)
        return request.user.is_superuser or request.user.is_staff or role in ["admin", "tour_manager", "fleet_lead"]


class IsAdminOrFleetLeadOrReadOnly(permissions.BasePermission):
    """
    Allow read-only for anyone.
    Write allowed for Admin and Fleet Lead.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        role = get_role_name(request.user)
        return request.user.is_superuser or request.user.is_staff or role in ["admin", "fleet_lead"]


class IsAdminOrTourManagerOrFleetLead(permissions.BasePermission):
    """
    Full access (read/write) for Admin, Tour Manager, and Fleet Lead.
    No access for others.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        role = get_role_name(request.user)
        return request.user.is_superuser or request.user.is_staff or role in ["admin", "tour_manager", "fleet_lead"]


class IsDriver(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return get_role_name(request.user) == "driver"


class TenantScopedMixin:
    """
    Mixin to automatically scope querysets and creation by tenant.
    """
    tenant_lookup_kwarg = "tenant_id"  # Usually the field name in the model

    def get_user_tenant(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return None
        # Allow superusers to bypass tenant filtering if they are not bound to a tenant
        role_name = (getattr(getattr(user, "role", None), "name", "") or "").lower()
        if user.is_superuser or role_name == "admin":
            return getattr(user, "tenant_id", None)
        return getattr(user, "tenant_id", None)

    def apply_tenant_filter(self, qs, lookup_prefix=""):
        """
        Filters the queryset by the current user's tenant.
        lookup_prefix example: 'trip__tenant_id' or 'tenant_id'.
        """
        user = self.request.user
        # Admin / Superuser can see all if they don't have a specific tenant assigned.
        # But wait, if they HAVE a tenant assigned, should they only see their tenant?
        # Typically yes.
        tenant_id = getattr(user, "tenant_id", None)
        if tenant_id:
            filter_kwarg = f"{lookup_prefix}id" if lookup_prefix.endswith("tenant_") else lookup_prefix
            if not filter_kwarg:
                filter_kwarg = "tenant_id"
            qs = qs.filter(**{filter_kwarg: tenant_id})
        return qs

    def enforce_tenant_on_create(self, serializer, tenant_field="tenant"):
        """
        Ensures the created object is assigned to the current user's tenant.
        """
        from rest_framework.exceptions import ValidationError
        user = self.request.user
        user_tenant = getattr(user, "tenant", None)
        requested_tenant = serializer.validated_data.get(tenant_field)

        if user_tenant and requested_tenant and user_tenant != requested_tenant:
            raise ValidationError("You cannot assign a different tenant")

        tenant = user_tenant or requested_tenant
        if tenant is None:
            raise ValidationError(
                f"A tenant is required. Provide {tenant_field}_id or assign a tenant to the user."
            )

        serializer.save(**{tenant_field: tenant})
