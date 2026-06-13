from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from passengers.models import Passenger
from trips.models import Trip, TripBus
from transactions.models import Transaction


class DashboardOverviewAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Dashboard overview",
        description=(
            "Return counts of trips, passengers, and buses grouped by trip status "
            "(planned, doing, done). Results are tenant-scoped when the user has a tenant."
        ),
        responses={
            200: {
                "type": "object",
                "properties": {
                    "trips": {
                        "type": "object",
                        "properties": {
                            "total": {"type": "integer"},
                            "planned": {"type": "integer"},
                            "doing": {"type": "integer"},
                            "done": {"type": "integer"},
                        },
                    },
                    "passengers": {
                        "type": "object",
                        "properties": {
                            "total": {"type": "integer"},
                            "planned": {"type": "integer"},
                            "doing": {"type": "integer"},
                            "done": {"type": "integer"},
                        },
                    },
                    "buses": {
                        "type": "object",
                        "properties": {
                            "total": {"type": "integer"},
                            "planned": {"type": "integer"},
                            "doing": {"type": "integer"},
                            "done": {"type": "integer"},
                        },
                    },
                    "recent_trips": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "integer"},
                                "name": {"type": "string"},
                                "status": {"type": "string"},
                                "start_date": {"type": "string", "format": "date"},
                            },
                        },
                    },
                    "recent_transactions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "integer"},
                                "passenger_name": {"type": "string"},
                                "round_name": {"type": "string"},
                                "bus_number": {"type": "string"},
                                "check_in": {"type": "string", "format": "date-time"},
                            },
                        },
                    },
                },
            }
        },
        tags=["Dashboard"],
    )
    def get(self, request):
        tenant_id = getattr(request.user, "tenant_id", None)

        trips_qs = Trip.objects.all()
        if tenant_id:
            trips_qs = trips_qs.filter(tenant_id=tenant_id)

        trip_counts = trips_qs.aggregate(
            total=Count("id"),
            planned=Count("id", filter=Q(status=Trip.Status.PLANNED)),
            doing=Count("id", filter=Q(status=Trip.Status.DOING)),
            done=Count("id", filter=Q(status=Trip.Status.DONE)),
        )

        passengers_qs = Passenger.objects.all()
        if tenant_id:
            passengers_qs = passengers_qs.filter(tenant_id=tenant_id)

        passenger_counts = passengers_qs.aggregate(
            total=Count("id", distinct=True),
            planned=Count("id", filter=Q(bus_assignments__trip__status=Trip.Status.PLANNED), distinct=True),
            doing=Count("id", filter=Q(bus_assignments__trip__status=Trip.Status.DOING), distinct=True),
            done=Count("id", filter=Q(bus_assignments__trip__status=Trip.Status.DONE), distinct=True),
        )

        trip_buses_qs = TripBus.objects.select_related("trip")
        if tenant_id:
            trip_buses_qs = trip_buses_qs.filter(trip__tenant_id=tenant_id)

        bus_counts = trip_buses_qs.aggregate(
            total=Count("id"),
            planned=Count("id", filter=Q(trip__status=Trip.Status.PLANNED)),
            doing=Count("id", filter=Q(trip__status=Trip.Status.DOING)),
            done=Count("id", filter=Q(trip__status=Trip.Status.DONE)),
        )

        recent_trips_qs = trips_qs.order_by("-updated_at")[:5]
        recent_trips = [
            {
                "id": t.id,
                "name": t.name,
                "status": t.status,
                "start_date": t.start_date.isoformat(),
            }
            for t in recent_trips_qs
        ]

        transactions_qs = Transaction.objects.select_related(
            "passenger", "round_bus__round", "round_bus__trip_bus__bus"
        )
        if tenant_id:
            transactions_qs = transactions_qs.filter(passenger__tenant_id=tenant_id)
        
        recent_transactions_qs = transactions_qs.order_by("-check_in")[:5]
        recent_transactions = [
            {
                "id": tx.id,
                "passenger_name": tx.passenger.name,
                "round_name": tx.round_bus.round.name,
                "bus_number": tx.round_bus.trip_bus.bus.registration_number,
                "check_in": tx.check_in.isoformat(),
            }
            for tx in recent_transactions_qs
        ]

        payload = {
            "trips": trip_counts,
            "passengers": passenger_counts,
            "buses": bus_counts,
            "recent_trips": recent_trips,
            "recent_transactions": recent_transactions,
        }
        return Response(payload)
