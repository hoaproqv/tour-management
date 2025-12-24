from drf_spectacular.utils import extend_schema
from rest_framework.renderers import TemplateHTMLRenderer
from rest_framework.response import Response
from rest_framework.views import APIView


@extend_schema(
    summary="Index Page API",
    description="This API serves the index page of the application.",
    request=None,  # Không có request body
    responses={
        200: {
            "description": "Index page rendered successfully",
            "example": {"active_page": "index"},
        },
        302: {
            "description": "Redirected to login page",
        },
    },
    tags=["Views"],
)
class IndexPageAPIView(APIView):
    renderer_classes = [TemplateHTMLRenderer]
    template_name = "index.html"
    permission_classes = []  # Bỏ permission để tự xử lý authentication
    authentication_classes = []  # Bỏ authentication để tự kiểm tra

    def get(self, request):

        context = {
            "active_page": "index",
        }
        return Response(context)
