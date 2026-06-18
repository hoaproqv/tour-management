from django.urls import path

from rounds.views import (
    RoundBulkDeleteView,
    RoundBusDetailView,
    RoundBusListCreateView,
    RoundDetailView,
    RoundExportView,
    RoundImportView,
    RoundListCreateView,
    RoundReorderView,
    RoundTemplateDownloadView,
)

urlpatterns = [
    path("rounds/bulk-delete/", RoundBulkDeleteView.as_view(), name="round-bulk-delete"),
    path("rounds/", RoundListCreateView.as_view(), name="round-list-create"),
    path("rounds/reorder/", RoundReorderView.as_view(), name="round-reorder"),
    path("rounds/import/", RoundImportView.as_view(), name="round-import"),
    path("rounds/import/template/", RoundTemplateDownloadView.as_view(), name="round-template"),
    path("rounds/export/", RoundExportView.as_view(), name="round-export"),
    path("rounds/<int:pk>/", RoundDetailView.as_view(), name="round-detail"),
    path("round-buses/", RoundBusListCreateView.as_view(), name="roundbus-list-create"),
    path("round-buses/<int:pk>/", RoundBusDetailView.as_view(), name="roundbus-detail"),
]
