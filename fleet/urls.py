from django.urls import path

from fleet.views import (
    BusBulkDeleteView,
    BusDetailView,
    BusExportView,
    BusImportView,
    BusListCreateView,
    BusTemplateDownloadView,
)

urlpatterns = [
    path("buses/bulk-delete/", BusBulkDeleteView.as_view(), name="bus-bulk-delete"),
    path("buses/", BusListCreateView.as_view(), name="bus-list-create"),
    path("buses/import/", BusImportView.as_view(), name="bus-import"),
    path("buses/import/template/", BusTemplateDownloadView.as_view(), name="bus-template"),
    path("buses/export/", BusExportView.as_view(), name="bus-export"),
    path("buses/<int:pk>/", BusDetailView.as_view(), name="bus-detail"),
]
