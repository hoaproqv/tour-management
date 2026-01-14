import json
import logging

import paho.mqtt.publish as publish
from django.conf import settings
from django.db.models import Count, Max, Q
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status

from rounds.models import Round, RoundBus
from rounds.serializers import RoundBusSerializer, RoundSerializer

logger = logging.getLogger(__name__)


def publish_round_finalize_to_mqtt(payload: dict):
    try:
        if not settings.MQTT_URL:
            logger.warning("MQTT_URL not configured, skipping round finalize publish")
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

        topic = f"round-finalize/{payload.get('round_bus')}"

        publish.single(
            topic,
            payload=json.dumps(payload),
            hostname=host,
            port=port,
            auth=auth,
            tls={} if settings.MQTT_URL.startswith("wss") else None,
            transport="websockets" if settings.MQTT_URL.startswith("ws") else "tcp",
        )

        logger.info("Published round finalize to MQTT topic: %s", topic)
    except Exception as exc:  # pragma: no cover - defensive log
        logger.error("Failed to publish round finalize to MQTT: %s", exc)


def sync_round_progress(round_obj: Round, *, prev_status: str | None = None) -> Round:
    """Ensure round timing/status reflect finalized buses, and start the next round when this one completes."""

    aggregates = round_obj.round_buses.aggregate(
        total=Count("id"),
        finalized=Count("id", filter=Q(finalized_at__isnull=False)),
        latest_finalized=Max("finalized_at"),
    )

    total = aggregates.get("total") or 0
    finalized = aggregates.get("finalized") or 0
    latest_finalized = aggregates.get("latest_finalized")

    updates: dict = {}

    status_changed_to_done = False

    if total and finalized == total and latest_finalized:
        # All buses closed: mark the round done and persist the real completion time.
        if round_obj.actual_time != latest_finalized:
            updates["actual_time"] = latest_finalized
        if round_obj.status != Round.Status.DONE:
            updates["status"] = Round.Status.DONE
            status_changed_to_done = prev_status != Round.Status.DONE
    else:
        # Not yet fully finalized: reflect in-progress or planned state and clear any stale time.
        next_status = Round.Status.DOING if finalized else Round.Status.PLANNED
        if round_obj.status != next_status:
            updates["status"] = next_status
        if round_obj.actual_time is not None:
            updates["actual_time"] = None

    if updates:
        Round.objects.filter(pk=round_obj.pk).update(**updates)
        for field, value in updates.items():
            setattr(round_obj, field, value)

    if status_changed_to_done:
        # If no other round is in-progress for this trip, move the next planned round into doing.
        has_doing = (
            Round.objects.filter(
                trip=round_obj.trip,
                status=Round.Status.DOING,
            )
            .exclude(pk=round_obj.pk)
            .exists()
        )

        if not has_doing:
            next_round = (
                Round.objects.filter(
                    trip=round_obj.trip,
                    sequence__gt=round_obj.sequence,
                )
                .order_by("sequence")
                .first()
            )
            if next_round and next_round.status == Round.Status.PLANNED:
                Round.objects.filter(pk=next_round.pk).update(status=Round.Status.DOING)
                next_round.status = Round.Status.DOING

    return round_obj


class RoundListCreateView(generics.ListCreateAPIView):
    serializer_class = RoundSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Round.objects.select_related("trip").prefetch_related(
            "round_buses",
            "round_buses__trip_bus",
            "round_buses__trip_bus__bus",
        )
        user = self.request.user
        tenant_id = getattr(user, "tenant_id", None)
        if tenant_id:
            qs = qs.filter(trip__tenant_id=tenant_id)
        return qs

    @extend_schema(
        summary="List rounds",
        description="Returns all rounds. If the user belongs to a tenant, results are scoped to that tenant's trips.",
        responses={200: RoundSerializer},
        tags=["Rounds"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Create round",
        description="Create a round for a trip. Sequence must be unique within a trip.",
        request=RoundSerializer,
        responses={
            201: RoundSerializer,
            400: {
                "description": "Validation error",
                "example": {"sequence": ["Sequence must be unique per trip."]},
            },
        },
        tags=["Rounds"],
    )
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            response.data = {"success": True, "data": response.data}
        return response


class RoundDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RoundSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Round.objects.select_related("trip").prefetch_related(
            "round_buses",
            "round_buses__trip_bus",
            "round_buses__trip_bus__bus",
        )
        user = self.request.user
        tenant_id = getattr(user, "tenant_id", None)
        if tenant_id:
            qs = qs.filter(trip__tenant_id=tenant_id)
        return qs

    @extend_schema(
        summary="Retrieve round",
        description="Get a single round by ID, scoped by tenant if applicable.",
        responses={200: RoundSerializer, 404: {"description": "Round not found"}},
        tags=["Rounds"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Update round",
        description="Update round fields. Sequence must remain unique within the trip.",
        request=RoundSerializer,
        responses={200: RoundSerializer, 400: {"description": "Validation error"}},
        tags=["Rounds"],
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @extend_schema(
        summary="Partial update round",
        description="Partially update round fields.",
        request=RoundSerializer,
        responses={200: RoundSerializer, 400: {"description": "Validation error"}},
        tags=["Rounds"],
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    @extend_schema(
        summary="Delete round",
        description="Delete a round by ID.",
        responses={204: None, 404: {"description": "Round not found"}},
        tags=["Rounds"],
    )
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)


class RoundBusListCreateView(generics.ListCreateAPIView):
    serializer_class = RoundBusSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = RoundBus.objects.select_related("round", "trip_bus", "trip_bus__trip")
        user = self.request.user
        tenant_id = getattr(user, "tenant_id", None)
        if tenant_id:
            qs = qs.filter(trip_bus__trip__tenant_id=tenant_id)
        return qs

    @extend_schema(
        summary="List round-bus assignments",
        description="Returns round-bus assignments, scoped by tenant if the user belongs to one.",
        responses={200: RoundBusSerializer},
        tags=["RoundBuses"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Create round-bus assignment",
        description="Assign a round to a trip bus. Each round-bus pair must be unique.",
        request=RoundBusSerializer,
        responses={
            201: RoundBusSerializer,
            400: {
                "description": "Validation error",
                "example": {
                    "non_field_errors": "This round is already assigned to the bus."
                },
            },
        },
        tags=["RoundBuses"],
    )
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED:
            response.data = {"success": True, "data": response.data}
        return response

    def perform_create(self, serializer):
        obj = serializer.save()
        sync_round_progress(obj.round, prev_status=obj.round.status)


class RoundBusDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RoundBusSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = RoundBus.objects.select_related("round", "trip_bus", "trip_bus__trip")
        user = self.request.user
        tenant_id = getattr(user, "tenant_id", None)
        if tenant_id:
            qs = qs.filter(trip_bus__trip__tenant_id=tenant_id)
        return qs

    @extend_schema(
        summary="Retrieve round-bus assignment",
        description="Get a single round-bus assignment by ID, scoped by tenant if applicable.",
        responses={200: RoundBusSerializer, 404: {"description": "RoundBus not found"}},
        tags=["RoundBuses"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        summary="Update round-bus assignment",
        description="Update a round-bus assignment. The round and trip bus pair must stay unique.",
        request=RoundBusSerializer,
        responses={200: RoundBusSerializer, 400: {"description": "Validation error"}},
        tags=["RoundBuses"],
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @extend_schema(
        summary="Partial update round-bus assignment",
        description="Partially update a round-bus assignment.",
        request=RoundBusSerializer,
        responses={200: RoundBusSerializer, 400: {"description": "Validation error"}},
        tags=["RoundBuses"],
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    @extend_schema(
        summary="Delete round-bus assignment",
        description="Delete a round-bus assignment by ID.",
        responses={204: None, 404: {"description": "RoundBus not found"}},
        tags=["RoundBuses"],
    )
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)

    def perform_update(self, serializer):
        prev_finalized_at = getattr(serializer.instance, "finalized_at", None)
        round_obj = serializer.instance.round
        prev_round_status = getattr(round_obj, "status", None)
        obj = serializer.save()
        sync_round_progress(obj.round, prev_status=prev_round_status)
        if prev_finalized_at != obj.finalized_at:
            payload = {
                "round_bus": obj.id,
                "round": obj.round_id,
                "trip_bus": obj.trip_bus_id,
                "trip": getattr(obj.trip_bus, "trip_id", None),
                "finalized_at": (
                    obj.finalized_at.isoformat() if obj.finalized_at else None
                ),
            }
            publish_round_finalize_to_mqtt(payload)
        return obj

    def perform_destroy(self, instance):
        round_obj = instance.round
        prev_round_status = getattr(round_obj, "status", None)
        super().perform_destroy(instance)
        sync_round_progress(round_obj, prev_status=prev_round_status)
