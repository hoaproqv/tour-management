from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError

from core.permissions import IsAdminOrTourManagerOrReadOnly, TenantScopedMixin

from trips.models import Trip, TripBus
from trips.serializers import TripBusSerializer, TripSerializer


class TripListCreateView(TenantScopedMixin, generics.ListCreateAPIView):
    serializer_class = TripSerializer
    permission_classes = [IsAdminOrTourManagerOrReadOnly]

    def get_queryset(self):
        qs = Trip.objects.select_related("tenant").prefetch_related(
            "trip_buses__manager", "trip_buses__driver"
        )
        return self.apply_tenant_filter(qs, "tenant_id")

    def perform_create(self, serializer):
        self.enforce_tenant_on_create(serializer, "tenant")

    @extend_schema(
        summary="List trips",
        description="Returns trips scoped by user's tenant.",
        responses={200: TripSerializer},
        tags=["Trips"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Create trip",
        description="Create a trip under the current user's tenant.",
        request=TripSerializer,
        responses={201: TripSerializer, 400: {"description": "Validation error"}},
        tags=["Trips"],
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class TripDetailView(TenantScopedMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TripSerializer
    permission_classes = [IsAdminOrTourManagerOrReadOnly]

    def get_queryset(self):
        qs = Trip.objects.select_related("tenant").prefetch_related(
            "trip_buses__manager", "trip_buses__driver"
        )
        return self.apply_tenant_filter(qs, "tenant_id")

    @extend_schema(
        summary="Retrieve trip",
        description="Get a trip by ID (tenant scoped).",
        responses={200: TripSerializer, 404: {"description": "Not found"}},
        tags=["Trips"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Update trip",
        description="Update a trip's fields.",
        request=TripSerializer,
        responses={200: TripSerializer, 400: {"description": "Validation error"}},
        tags=["Trips"],
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @extend_schema(
        summary="Partial update trip",
        description="Partially update a trip's fields.",
        request=TripSerializer,
        responses={200: TripSerializer, 400: {"description": "Validation error"}},
        tags=["Trips"],
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    @extend_schema(
        summary="Delete trip",
        description="Delete a trip by ID.",
        responses={204: None, 404: {"description": "Not found"}},
        tags=["Trips"],
    )
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)


class TripBusListCreateView(TenantScopedMixin, generics.ListCreateAPIView):
    serializer_class = TripBusSerializer
    permission_classes = [IsAdminOrTourManagerOrReadOnly]

    def get_queryset(self):
        qs = TripBus.objects.select_related("trip", "bus", "manager", "driver")
        qs = self.apply_tenant_filter(qs, "trip__tenant_id")
        trip_param = self.request.query_params.get("trip")
        if trip_param:
            qs = qs.filter(trip_id=trip_param)
        return qs

    @extend_schema(
        summary="List trip buses",
        description="Returns trip-bus assignments scoped by tenant.",
        responses={200: TripBusSerializer},
        tags=["TripBuses"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Create trip bus",
        description="Create a trip-bus assignment.",
        request=TripBusSerializer,
        responses={201: TripBusSerializer, 400: {"description": "Validation error"}},
        tags=["TripBuses"],
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class TripBusDetailView(TenantScopedMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TripBusSerializer
    permission_classes = [IsAdminOrTourManagerOrReadOnly]

    def get_queryset(self):
        qs = TripBus.objects.select_related("trip", "bus", "manager", "driver")
        return self.apply_tenant_filter(qs, "trip__tenant_id")

    @extend_schema(
        summary="Retrieve trip bus",
        description="Get a trip-bus assignment by ID (tenant scoped).",
        responses={200: TripBusSerializer, 404: {"description": "Not found"}},
        tags=["TripBuses"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Update trip bus",
        description="Update a trip-bus assignment.",
        request=TripBusSerializer,
        responses={200: TripBusSerializer, 400: {"description": "Validation error"}},
        tags=["TripBuses"],
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @extend_schema(
        summary="Partial update trip bus",
        description="Partially update a trip-bus assignment.",
        request=TripBusSerializer,
        responses={200: TripBusSerializer, 400: {"description": "Validation error"}},
        tags=["TripBuses"],
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    @extend_schema(
        summary="Delete trip bus",
        description="Delete a trip-bus assignment by ID.",
        responses={204: None, 404: {"description": "Not found"}},
        tags=["TripBuses"],
    )
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)

class TripBulkDeleteView(TripListCreateView):
    from rest_framework import serializers
    from drf_spectacular.utils import inline_serializer
    from common.views import BaseAPIView

    @extend_schema(
        summary="Bulk delete trips",
        description="Delete multiple trips by ID.",
        request=inline_serializer("TripBulkDelete", fields={"ids": serializers.ListField(child=serializers.IntegerField())}),
        responses={
            200: inline_serializer(
                "TripBulkDeleteResponse", 
                fields={
                    "success": serializers.BooleanField(), 
                    "data": inline_serializer("TripBulkDeleteData", fields={"deleted": serializers.IntegerField()})
                }
            )
        },
        tags=["Trips"],
    )
    def post(self, request, *args, **kwargs):
        from common.views import BaseAPIView
        ids = request.data.get("ids", [])
        if not ids:
            return BaseAPIView().error("No ids provided")
        qs = self.get_queryset().filter(id__in=ids)
        deleted, _ = qs.delete()
        return BaseAPIView().success({"deleted": deleted})
