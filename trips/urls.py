from django.urls import path

from trips.views import (
    TripBusDetailView,
    TripBusListCreateView,
    TripDetailView,
    TripListCreateView,
)

urlpatterns = [
    path("trips/", TripListCreateView.as_view(), name="trip-list-create"),
    path("trips/<uuid:pk>/", TripDetailView.as_view(), name="trip-detail"),
    path("trip-buses/", TripBusListCreateView.as_view(), name="tripbus-list-create"),
    path("trip-buses/<uuid:pk>/", TripBusDetailView.as_view(), name="tripbus-detail"),
]
