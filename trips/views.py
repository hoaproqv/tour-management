from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions

from trips.models import Trip, TripBus
from trips.serializers import TripBusSerializer, TripSerializer


class TripListCreateView(generics.ListCreateAPIView):
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Trip.objects.select_related("tenant")
        user = self.request.user
        tenant_id = getattr(user, "tenant_id", None)
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        tenant = getattr(user, "tenant", None)
        if tenant is None:
            raise ValueError("User has no tenant assigned")
        serializer.save(tenant=tenant)

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


class TripDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Trip.objects.select_related("tenant")
        user = self.request.user
        tenant_id = getattr(user, "tenant_id", None)
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs

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


class TripBusListCreateView(generics.ListCreateAPIView):
    serializer_class = TripBusSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = TripBus.objects.select_related("trip", "bus", "manager")
        user = self.request.user
        tenant_id = getattr(user, "tenant_id", None)
        if tenant_id:
            qs = qs.filter(trip__tenant_id=tenant_id)
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


class TripBusDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TripBusSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = TripBus.objects.select_related("trip", "bus", "manager")
        user = self.request.user
        tenant_id = getattr(user, "tenant_id", None)
        if tenant_id:
            qs = qs.filter(trip__tenant_id=tenant_id)
        return qs

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
