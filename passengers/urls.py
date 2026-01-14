from django.urls import path

from passengers.views import (
    PassengerDetailView,
    PassengerListCreateView,
    PassengerTransferDetailView,
    PassengerTransferListCreateView,
)

urlpatterns = [
    path(
        "passengers/", PassengerListCreateView.as_view(), name="passenger-list-create"
    ),
    path(
        "passengers/<int:pk>/", PassengerDetailView.as_view(), name="passenger-detail"
    ),
    path(
        "passenger-transfers/",
        PassengerTransferListCreateView.as_view(),
        name="passenger-transfer-list-create",
    ),
    path(
        "passenger-transfers/<int:pk>/",
        PassengerTransferDetailView.as_view(),
        name="passenger-transfer-detail",
    ),
]
