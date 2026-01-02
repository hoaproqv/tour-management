from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions

from passengers.models import Passenger
from passengers.serializers import PassengerSerializer


class PassengerListCreateView(generics.ListCreateAPIView):
    serializer_class = PassengerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Passenger.objects.select_related("trip", "original_bus")
        user = self.request.user
        if getattr(user, "tenant_id", None):
            qs = qs.filter(trip__tenant_id=user.tenant_id)
        return qs

    @extend_schema(
        summary="List passengers",
        description="Returns passengers, scoped to user's tenant trips if applicable.",
        responses={200: PassengerSerializer},
        tags=["Passengers"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Create passenger",
        description="Create a passenger belonging to a trip.",
        request=PassengerSerializer,
        responses={201: PassengerSerializer, 400: {"description": "Validation error"}},
        tags=["Passengers"],
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class PassengerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PassengerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Passenger.objects.select_related("trip", "original_bus")
        user = self.request.user
        if getattr(user, "tenant_id", None):
            qs = qs.filter(trip__tenant_id=user.tenant_id)
        return qs

    @extend_schema(
        summary="Retrieve passenger",
        description="Get a passenger by ID (tenant scoped).",
        responses={200: PassengerSerializer, 404: {"description": "Not found"}},
        tags=["Passengers"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Update passenger",
        description="Update passenger fields.",
        request=PassengerSerializer,
        responses={200: PassengerSerializer, 400: {"description": "Validation error"}},
        tags=["Passengers"],
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @extend_schema(
        summary="Partial update passenger",
        description="Partially update passenger fields.",
        request=PassengerSerializer,
        responses={200: PassengerSerializer, 400: {"description": "Validation error"}},
        tags=["Passengers"],
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    @extend_schema(
        summary="Delete passenger",
        description="Delete a passenger by ID.",
        responses={204: None, 404: {"description": "Not found"}},
        tags=["Passengers"],
    )
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)
