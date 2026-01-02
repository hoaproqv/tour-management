from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions

from fleet.models import Bus
from fleet.serializers import BusSerializer


class BusListCreateView(generics.ListCreateAPIView):
    serializer_class = BusSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Bus.objects.all().order_by("registration_number")

    @extend_schema(
        summary="List buses",
        description="Return all buses ordered by registration number.",
        responses={200: BusSerializer},
        tags=["Buses"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Create bus",
        description="Create a new bus record.",
        request=BusSerializer,
        responses={201: BusSerializer, 400: {"description": "Validation error"}},
        tags=["Buses"],
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class BusDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BusSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Bus.objects.all().order_by("registration_number")

    @extend_schema(
        summary="Retrieve bus",
        description="Get a bus by ID.",
        responses={200: BusSerializer, 404: {"description": "Not found"}},
        tags=["Buses"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Update bus",
        description="Update all fields of a bus.",
        request=BusSerializer,
        responses={200: BusSerializer, 400: {"description": "Validation error"}},
        tags=["Buses"],
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @extend_schema(
        summary="Partial update bus",
        description="Partially update fields of a bus.",
        request=BusSerializer,
        responses={200: BusSerializer, 400: {"description": "Validation error"}},
        tags=["Buses"],
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    @extend_schema(
        summary="Delete bus",
        description="Delete a bus by ID.",
        responses={204: None, 404: {"description": "Not found"}},
        tags=["Buses"],
    )
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)
