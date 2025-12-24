from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class CustomPagination(PageNumberPagination):
    page_size_query_param = "limit"  # cho phép client điều chỉnh limit nếu muốn

    def get_paginated_response(self, data):
        return Response(
            {
                "data": data,
                "pagination": {
                    "page": self.page.number,
                    "limit": self.get_page_size(self.request),
                    "total_page": self.page.paginator.num_pages,
                    "total_items": self.page.paginator.count,
                },
            }
        )
