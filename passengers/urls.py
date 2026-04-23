from django.urls import path

from passengers.views import (
    ImportedBusListView,
    ImportedBusMapView,
    PassengerAssignmentDetailView,
    PassengerAssignmentListCreateView,
    PassengerDetailView,
    PassengerExportView,
    PassengerImportView,
    PassengerListCreateView,
    PassengerTransferDetailView,
    PassengerTransferListCreateView,
)

urlpatterns = [
    path(
        "passengers/", PassengerListCreateView.as_view(), name="passenger-list-create"
    ),
    path(
        "passengers/import/", PassengerImportView.as_view(), name="passenger-import"
    ),
    path(
        "passengers/export/", PassengerExportView.as_view(), name="passenger-export"
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
    path(
        "imported-buses/",
        ImportedBusListView.as_view(),
        name="imported-bus-list",
    ),
    path(
        "imported-buses/<int:pk>/map/",
        ImportedBusMapView.as_view(),
        name="imported-bus-map",
    ),
]
