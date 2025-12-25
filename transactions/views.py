from rest_framework import permissions

from common.viewsets import CachedModelViewSet
from transactions.models import Transaction
from transactions.serializers import TransactionSerializer


class TransactionViewSet(CachedModelViewSet):
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
