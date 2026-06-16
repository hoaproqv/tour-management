import json
import logging

import paho.mqtt.publish as publish
from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions
from rest_framework.response import Response

from django.db import transaction
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework import status

from core.permissions import (
    IsAdminOrFleetLeadOrReadOnly,
    IsAdminOrTourManagerOrFleetLeadOrReadOnly,
    get_role_name,
    TenantScopedMixin,
)

from transactions.models import Transaction
from transactions.serializers import TransactionSerializer
from passengers.models import PassengerTransfer

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


class SwitchBusView(APIView):
    permission_classes = [IsAdminOrTourManagerOrFleetLeadOrReadOnly]

    @extend_schema(
        summary="Switch passenger bus atomically",
        description="Check out old transaction, create new check in, and upsert transfer.",
        request={
            "type": "object",
            "properties": {
                "passenger_id": {"type": "string"},
                "from_txn_id": {"type": "integer"},
                "target_round_bus_id": {"type": "integer"},
                "target_trip_bus_id": {"type": "integer"},
                "from_trip_bus_id": {"type": "integer"},
                "trip_id": {"type": "string"},
            },
            "required": ["passenger_id", "target_round_bus_id", "target_trip_bus_id", "trip_id"],
        },
        responses={200: {"description": "Success"}},
        tags=["Transactions"],
    )
    def post(self, request, *args, **kwargs):
        passenger_id = request.data.get("passenger_id")
        from_txn_id = request.data.get("from_txn_id")
        target_round_bus_id = request.data.get("target_round_bus_id")
        target_trip_bus_id = request.data.get("target_trip_bus_id")
        from_trip_bus_id = request.data.get("from_trip_bus_id")
        trip_id = request.data.get("trip_id")

        if not all([passenger_id, target_round_bus_id, target_trip_bus_id, trip_id]):
            return Response({"detail": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()

        try:
            from rounds.models import RoundBus
            with transaction.atomic():
                target_rb = RoundBus.objects.filter(id=target_round_bus_id).first()
                if not target_rb:
                    return Response({"detail": "RoundBus not found"}, status=status.HTTP_404_NOT_FOUND)

                # Race condition check: Ensure no other active check-in exists for this passenger in this round
                existing_txn = Transaction.objects.filter(
                    passenger_id=passenger_id,
                    round_bus__round_id=target_rb.round_id,
                    check_out__isnull=True
                )
                if from_txn_id:
                    existing_txn = existing_txn.exclude(id=from_txn_id)
                
                existing_txn = existing_txn.select_related('round_bus__trip_bus').first()

                if existing_txn:
                    bus_label = existing_txn.round_bus.trip_bus.license_plate or "khác"
                    return Response(
                        {"detail": f"Hành khách đã điểm danh ở xe {bus_label}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # 1. Check out old transaction if provided
                if from_txn_id:
                    txn = Transaction.objects.filter(id=from_txn_id).first()
                    if txn and not txn.check_out:
                        txn.check_out = now
                        txn.save(update_fields=["check_out"])
                        publish_transaction_to_mqtt(TransactionSerializer(txn).data)

                # 2. Create new transaction
                new_txn = Transaction.objects.create(
                    passenger_id=passenger_id,
                    round_bus_id=target_round_bus_id,
                    check_in=now,
                )
                publish_transaction_to_mqtt(TransactionSerializer(new_txn).data)

                # 3. Handle transfer
                transfer_action = request.data.get("transfer_action")
                existing_transfer_id = request.data.get("existing_transfer_id")
                
                from passengers.views import publish_transfer_to_mqtt
                from passengers.serializers import PassengerTransferSerializer
                
                if transfer_action == "delete" and existing_transfer_id:
                    PassengerTransfer.objects.filter(id=existing_transfer_id).delete()
                    publish_transfer_to_mqtt({
                        "id": existing_transfer_id,
                        "passenger": str(passenger_id),
                        "trip": str(trip_id),
                        "deleted": True
                    })
                elif transfer_action == "upsert":
                    transfer, created = PassengerTransfer.objects.update_or_create(
                        passenger_id=passenger_id,
                        trip_id=trip_id,
                        defaults={
                            "to_trip_bus_id": target_trip_bus_id,
                            "from_trip_bus_id": from_trip_bus_id or None,
                        }
                    )
                    publish_transfer_to_mqtt(PassengerTransferSerializer(transfer).data)

            return Response({"success": True}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Failed to switch bus: {e}")
            return Response({"success": True}, status=status.HTTP_200_OK)


class UndoTransferView(APIView):
    permission_classes = [IsAdminOrTourManagerOrFleetLeadOrReadOnly]

    @extend_schema(
        summary="Undo passenger bus transfer",
        description="Delete all transactions for the passenger in the given round, and delete the transfer record.",
        request={
            "type": "object",
            "properties": {
                "passenger_id": {"type": "string"},
                "round_id": {"type": "string"},
                "trip_id": {"type": "string"},
            },
            "required": ["passenger_id", "round_id", "trip_id"],
        },
        responses={200: {"description": "Success"}},
        tags=["Transactions"],
    )
    def post(self, request, *args, **kwargs):
        passenger_id = request.data.get("passenger_id")
        round_id = request.data.get("round_id")
        trip_id = request.data.get("trip_id")

        if not all([passenger_id, round_id, trip_id]):
            return Response({"detail": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # 1. Delete all transactions for this passenger in the round
                txns = list(Transaction.objects.filter(
                    passenger_id=passenger_id,
                    round_bus__round_id=round_id
                ))
                for txn in txns:
                    txn_id = txn.id
                    txn.delete()
                    publish_transaction_to_mqtt({
                        "id": txn_id,
                        "deleted": True
                    })

                # 2. Delete the passenger transfer for the trip
                transfers = list(PassengerTransfer.objects.filter(
                    passenger_id=passenger_id,
                    trip_id=trip_id
                ))
                for tr in transfers:
                    tr_id = tr.id
                    tr_passenger_id = str(tr.passenger_id)
                    tr_trip_id = str(tr.trip_id)
                    tr.delete()
                    from passengers.views import publish_transfer_to_mqtt
                    publish_transfer_to_mqtt({
                        "id": tr_id,
                        "passenger": tr_passenger_id,
                        "trip": tr_trip_id,
                        "deleted": True
                    })

            return Response({"success": True}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Failed to undo transfer: {e}")
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TransactionListCreateView(TenantScopedMixin, generics.ListCreateAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [IsAdminOrFleetLeadOrReadOnly]

    def get_queryset(self):
        qs = Transaction.objects.select_related(
            "passenger", "round_bus", "round_bus__trip_bus", "round_bus__round"
        )
        return self.apply_tenant_filter(qs, "passenger__tenant_id")

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
        passenger_id = request.data.get("passenger")
        round_bus_id = request.data.get("round_bus")
        check_out = request.data.get("check_out")

        if passenger_id and round_bus_id and not check_out:
            # We are creating a new check-in transaction. Check for race conditions.
            from rounds.models import RoundBus
            with transaction.atomic():
                rb = RoundBus.objects.filter(id=round_bus_id).select_related('round').first()
                if rb:
                    existing_txn = Transaction.objects.filter(
                        passenger_id=passenger_id,
                        round_bus__round_id=rb.round_id,
                        check_out__isnull=True
                    ).select_related('round_bus__trip_bus').first()

                    if existing_txn:
                        bus_label = existing_txn.round_bus.trip_bus.license_plate or "khác"
                        return Response(
                            {"detail": f"Hành khách đã điểm danh ở xe {bus_label}"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                response = super().post(request, *args, **kwargs)
        else:
            response = super().post(request, *args, **kwargs)

        # Publish to MQTT after successful creation
        if response.status_code == 201:
            publish_transaction_to_mqtt(response.data)

        return response


class TransactionDetailView(TenantScopedMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [IsAdminOrFleetLeadOrReadOnly]

    def get_queryset(self):
        qs = Transaction.objects.select_related(
            "passenger", "round_bus", "round_bus__trip_bus", "round_bus__round"
        )
        return self.apply_tenant_filter(qs, "passenger__tenant_id")

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
