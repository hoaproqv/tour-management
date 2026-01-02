from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions

from transactions.models import Transaction
from transactions.serializers import TransactionSerializer


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
        return super().post(request, *args, **kwargs)


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
        return super().put(request, *args, **kwargs)

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
        return super().patch(request, *args, **kwargs)

    @extend_schema(
        summary="Delete transaction",
        description="Delete a transaction by ID.",
        responses={204: None, 404: {"description": "Not found"}},
        tags=["Transactions"],
    )
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)
