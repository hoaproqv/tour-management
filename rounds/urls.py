from django.urls import path

from rounds.views import (
    RoundBusDetailView,
    RoundBusListCreateView,
    RoundDetailView,
    RoundListCreateView,
)

urlpatterns = [
    path("rounds/", RoundListCreateView.as_view(), name="round-list-create"),
    path("rounds/<int:pk>/", RoundDetailView.as_view(), name="round-detail"),
    path("round-buses/", RoundBusListCreateView.as_view(), name="roundbus-list-create"),
    path("round-buses/<int:pk>/", RoundBusDetailView.as_view(), name="roundbus-detail"),
]
