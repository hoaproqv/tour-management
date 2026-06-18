from django.urls import path

from transactions.views import (
    BulkCheckOutView,
    SwitchBusView,
    TransactionDetailView,
    TransactionListCreateView,
    UndoTransferView,
)

urlpatterns = [
    path(
        "transactions/bulk-check-out/",
        BulkCheckOutView.as_view(),
        name="transaction-bulk-check-out",
    ),
    path(
        "transactions/undo-transfer/",
        UndoTransferView.as_view(),
        name="transaction-undo-transfer",
    ),
    path(
        "transactions/switch-bus/",
        SwitchBusView.as_view(),
        name="transaction-switch-bus",
    ),
    path(
        "transactions/",
        TransactionListCreateView.as_view(),
        name="transaction-list-create",
    ),
    path(
        "transactions/<int:pk>/",
        TransactionDetailView.as_view(),
        name="transaction-detail",
    ),
]
