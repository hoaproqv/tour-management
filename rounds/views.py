from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status

from rounds.models import Round, RoundBus
from rounds.serializers import RoundBusSerializer, RoundSerializer


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
