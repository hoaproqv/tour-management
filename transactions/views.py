import json
import logging

import paho.mqtt.publish as publish
from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions
from rest_framework.response import Response

from transactions.models import Transaction
from transactions.serializers import TransactionSerializer

logger = logging.getLogger(__name__)


def publish_transaction_to_mqtt(transaction_data):
    """Publish transaction data to MQTT broker"""
    try:
        if not settings.MQTT_URL:
            logger.warning("MQTT_URL not configured, skipping publish")
            return

        # Parse MQTT URL (format: wss://mqtt.toolhub.app:8084)
        mqtt_url = settings.MQTT_URL.replace("wss://", "").replace("ws://", "")
        if ":" in mqtt_url:
            host, port = mqtt_url.rsplit(":", 1)
            port = int(port)
        else:
            host = mqtt_url
            port = 8883 if settings.MQTT_URL.startswith("wss") else 1883

        topic = f"transactions/{transaction_data['id']}"

        auth = None
        if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
            auth = {
                "username": settings.MQTT_USERNAME,
                "password": settings.MQTT_PASSWORD,
            }

        publish.single(
            topic,
            payload=json.dumps(transaction_data),
            hostname=host,
            port=port,
            auth=auth,
            tls={} if settings.MQTT_URL.startswith("wss") else None,
            transport="websockets" if settings.MQTT_URL.startswith("ws") else "tcp",
        )

        logger.info(
            f"Published transaction {transaction_data['id']} to MQTT topic: {topic}"
        )
    except Exception as e:
        logger.error(f"Failed to publish to MQTT: {e}")


class TransactionListCreateView(generics.ListCreateAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Transaction.objects.select_related(
            "passenger", "round_bus", "round_bus__trip_bus", "round_bus__round"
        )
        user = self.request.user
        if getattr(user, "tenant_id", None):
            qs = qs.filter(passenger__trip__tenant_id=user.tenant_id)
        return qs

    @extend_schema(
        summary="List transactions",
        description="Returns transactions, scoped by tenant via passenger's trip.",
        responses={200: TransactionSerializer},
        tags=["Transactions"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Create transaction",
        description="Create a transaction tied to a passenger and round bus.",
        request=TransactionSerializer,
        responses={
            201: TransactionSerializer,
            400: {"description": "Validation error"},
        },
        tags=["Transactions"],
    )
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        # Publish to MQTT after successful creation
        if response.status_code == 201:
            publish_transaction_to_mqtt(response.data)

        return response


class TransactionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Transaction.objects.select_related(
            "passenger", "round_bus", "round_bus__trip_bus", "round_bus__round"
        )
        user = self.request.user
        if getattr(user, "tenant_id", None):
            qs = qs.filter(passenger__trip__tenant_id=user.tenant_id)
        return qs

    @extend_schema(
        summary="Retrieve transaction",
        description="Get a transaction by ID (tenant scoped).",
        responses={200: TransactionSerializer, 404: {"description": "Not found"}},
        tags=["Transactions"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Update transaction",
        description="Update transaction fields.",
        request=TransactionSerializer,
        responses={
            200: TransactionSerializer,
            400: {"description": "Validation error"},
        },
        tags=["Transactions"],
    )
    def put(self, request, *args, **kwargs):
        response = super().put(request, *args, **kwargs)

        # Publish to MQTT after successful update
        if response.status_code == 200:
            publish_transaction_to_mqtt(response.data)

        return response

    @extend_schema(
        summary="Partial update transaction",
        description="Partially update a transaction.",
        request=TransactionSerializer,
        responses={
            200: TransactionSerializer,
            400: {"description": "Validation error"},
        },
        tags=["Transactions"],
    )
    def patch(self, request, *args, **kwargs):
        response = super().patch(request, *args, **kwargs)

        # Publish to MQTT after successful update
        if response.status_code == 200:
            publish_transaction_to_mqtt(response.data)

        return response

    @extend_schema(
        summary="Delete transaction",
        description="Delete a transaction by ID.",
        responses={204: None, 404: {"description": "Not found"}},
        tags=["Transactions"],
    )
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)
