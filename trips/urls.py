from django.urls import path

from trips.views import (
    TripBusDetailView,
    TripBusListCreateView,
    TripDetailView,
    TripListCreateView,
    TripBulkDeleteView,
)

urlpatterns = [
    path("trips/bulk-delete/", TripBulkDeleteView.as_view(), name="trip-bulk-delete"),
    path("trips/", TripListCreateView.as_view(), name="trip-list-create"),
    path("trips/<int:pk>/", TripDetailView.as_view(), name="trip-detail"),
    path("trip-buses/", TripBusListCreateView.as_view(), name="tripbus-list-create"),
    path("trip-buses/<int:pk>/", TripBusDetailView.as_view(), name="tripbus-detail"),
]
