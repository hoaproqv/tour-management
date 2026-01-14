from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from passengers.models import Passenger
from trips.models import Trip, TripBus


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

        passengers_qs = Passenger.objects.select_related("trip")
        if tenant_id:
            passengers_qs = passengers_qs.filter(trip__tenant_id=tenant_id)

        passenger_counts = passengers_qs.aggregate(
            total=Count("id"),
            planned=Count("id", filter=Q(trip__status=Trip.Status.PLANNED)),
            doing=Count("id", filter=Q(trip__status=Trip.Status.DOING)),
            done=Count("id", filter=Q(trip__status=Trip.Status.DONE)),
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

        payload = {
            "trips": trip_counts,
            "passengers": passenger_counts,
            "buses": bus_counts,
        }
        return Response(payload)
