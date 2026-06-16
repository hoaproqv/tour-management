from django.urls import path

from trips.views import (
    TripBusDetailView,
    TripBusListCreateView,
    TripDetailView,
    TripListCreateView,
    TripBusBulkDeleteView,
    TripBusImportView,
    TripBusExportView,
    TripBusTemplateDownloadView,
)

urlpatterns = [
    path("trips/", TripListCreateView.as_view(), name="trip-list-create"),
    path("trips/<int:pk>/", TripDetailView.as_view(), name="trip-detail"),
    path("trip-buses/bulk-delete/", TripBusBulkDeleteView.as_view(), name="tripbus-bulk-delete"),
    path("trip-buses/import/", TripBusImportView.as_view(), name="tripbus-import"),
    path("trip-buses/export/", TripBusExportView.as_view(), name="tripbus-export"),
    path("trip-buses/import/template/", TripBusTemplateDownloadView.as_view(), name="tripbus-import-template"),
    path("trip-buses/", TripBusListCreateView.as_view(), name="tripbus-list-create"),
    path("trip-buses/<int:pk>/", TripBusDetailView.as_view(), name="tripbus-detail"),
]
