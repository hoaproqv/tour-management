from django.urls import path

from passengers.views import PassengerDetailView, PassengerListCreateView

urlpatterns = [
    path(
        "passengers/", PassengerListCreateView.as_view(), name="passenger-list-create"
    ),
    path(
        "passengers/<int:pk>/", PassengerDetailView.as_view(), name="passenger-detail"
    ),
]
