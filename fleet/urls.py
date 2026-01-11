from django.urls import path

from fleet.views import BusDetailView, BusListCreateView

urlpatterns = [
    path("buses/", BusListCreateView.as_view(), name="bus-list-create"),
    path("buses/<int:pk>/", BusDetailView.as_view(), name="bus-detail"),
]
