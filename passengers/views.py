import json
import logging

import paho.mqtt.publish as publish
from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions

from passengers.models import Passenger, PassengerTransfer
from passengers.serializers import PassengerSerializer, PassengerTransferSerializer

logger = logging.getLogger(__name__)


def publish_transfer_to_mqtt(payload: dict):
    try:
        if not settings.MQTT_URL:
            logger.warning("MQTT_URL not configured, skipping transfer publish")
            return

        mqtt_url = settings.MQTT_URL.replace("wss://", "").replace("ws://", "")
        if ":" in mqtt_url:
            host, port = mqtt_url.rsplit(":", 1)
            port = int(port)
        else:
            host = mqtt_url
            port = 8883 if settings.MQTT_URL.startswith("wss") else 1883

        auth = None
        if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
            auth = {
                "username": settings.MQTT_USERNAME,
                "password": settings.MQTT_PASSWORD,
            }

        topic = f"passenger-transfer/{payload.get('passenger')}"

        publish.single(
            topic,
            payload=json.dumps(payload),
            hostname=host,
            port=port,
            auth=auth,
            tls={} if settings.MQTT_URL.startswith("wss") else None,
            transport="websockets" if settings.MQTT_URL.startswith("ws") else "tcp",
        )

        logger.info("Published passenger transfer to MQTT topic: %s", topic)
    except Exception as exc:  # pragma: no cover - defensive log
        logger.error("Failed to publish transfer to MQTT: %s", exc)


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


class PassengerTransferListCreateView(generics.ListCreateAPIView):
    serializer_class = PassengerTransferSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = PassengerTransfer.objects.select_related(
            "passenger",
            "from_trip_bus",
            "to_trip_bus",
            "passenger__trip",
        )
        user = self.request.user
        tenant_id = getattr(user, "tenant_id", None)
        if tenant_id:
            qs = qs.filter(passenger__trip__tenant_id=tenant_id)
        trip = self.request.query_params.get("trip")
        if trip:
            qs = qs.filter(passenger__trip_id=trip)
        return qs

    def perform_create(self, serializer):
        instance = serializer.save()
        payload = {
            "id": instance.id,
            "passenger": instance.passenger_id,
            "from_trip_bus": instance.from_trip_bus_id,
            "to_trip_bus": instance.to_trip_bus_id,
            "trip": instance.passenger.trip_id,
            "deleted": False,
        }
        publish_transfer_to_mqtt(payload)

    @extend_schema(
        summary="List passenger transfers",
        description="List transfers; scoped by tenant and optional trip.",
        responses={200: PassengerTransferSerializer},
        tags=["PassengerTransfers"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Create or update passenger transfer",
        description="Create or replace the active transfer for a passenger.",
        request=PassengerTransferSerializer,
        responses={201: PassengerTransferSerializer, 200: PassengerTransferSerializer},
        tags=["PassengerTransfers"],
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class PassengerTransferDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PassengerTransferSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = PassengerTransfer.objects.select_related(
            "passenger",
            "from_trip_bus",
            "to_trip_bus",
            "passenger__trip",
        )
        user = self.request.user
        tenant_id = getattr(user, "tenant_id", None)
        if tenant_id:
            qs = qs.filter(passenger__trip__tenant_id=tenant_id)
        return qs

    def perform_update(self, serializer):
        instance = serializer.save()
        payload = {
            "id": instance.id,
            "passenger": instance.passenger_id,
            "from_trip_bus": instance.from_trip_bus_id,
            "to_trip_bus": instance.to_trip_bus_id,
            "trip": instance.passenger.trip_id,
            "deleted": False,
        }
        publish_transfer_to_mqtt(payload)

    def perform_destroy(self, instance):
        payload = {
            "id": instance.id,
            "passenger": instance.passenger_id,
            "from_trip_bus": instance.from_trip_bus_id,
            "to_trip_bus": instance.to_trip_bus_id,
            "trip": instance.passenger.trip_id,
            "deleted": True,
        }
        super().perform_destroy(instance)
        publish_transfer_to_mqtt(payload)

    @extend_schema(
        summary="Retrieve passenger transfer",
        responses={200: PassengerTransferSerializer, 404: {"description": "Not found"}},
        tags=["PassengerTransfers"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Update passenger transfer",
        request=PassengerTransferSerializer,
        responses={200: PassengerTransferSerializer},
        tags=["PassengerTransfers"],
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @extend_schema(
        summary="Delete passenger transfer",
        responses={204: None},
        tags=["PassengerTransfers"],
    )
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)
