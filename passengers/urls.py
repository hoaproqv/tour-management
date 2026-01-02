from django.urls import path

from passengers.views import PassengerDetailView, PassengerListCreateView

urlpatterns = [
    path(
        "passengers/", PassengerListCreateView.as_view(), name="passenger-list-create"
    ),
    path(
        "passengers/<uuid:pk>/", PassengerDetailView.as_view(), name="passenger-detail"
    ),
]
