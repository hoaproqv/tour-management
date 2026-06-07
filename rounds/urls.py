from django.urls import path

from rounds.views import (
    RoundBusDetailView,
    RoundBusListCreateView,
    RoundDetailView,
    RoundListCreateView,
    RoundImportView,
    RoundExportView,
    RoundTemplateDownloadView,
)

urlpatterns = [
    path("rounds/", RoundListCreateView.as_view(), name="round-list-create"),
    path("rounds/import/", RoundImportView.as_view(), name="round-import"),
    path("rounds/import/template/", RoundTemplateDownloadView.as_view(), name="round-template"),
    path("rounds/export/", RoundExportView.as_view(), name="round-export"),
    path("rounds/<int:pk>/", RoundDetailView.as_view(), name="round-detail"),
    path("round-buses/", RoundBusListCreateView.as_view(), name="roundbus-list-create"),
    path("round-buses/<int:pk>/", RoundBusDetailView.as_view(), name="roundbus-detail"),
]
