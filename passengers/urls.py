from django.urls import path

from passengers.views import (
    PassengerAssignmentDetailView,
    PassengerAssignmentListCreateView,
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
    path(
        "passenger-assignments/",
        PassengerAssignmentListCreateView.as_view(),
        name="passenger-assignment-list-create",
    ),
    path(
        "passenger-assignments/<int:pk>/",
        PassengerAssignmentDetailView.as_view(),
        name="passenger-assignment-detail",
    ),
]
