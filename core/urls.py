from django.urls import path, re_path

from core.views import IndexPageAPIView

urlpatterns = [
    path("login", IndexPageAPIView.as_view(), name="login_page"),
    path("manage-order", IndexPageAPIView.as_view(), name="order_page"),
    path("history", IndexPageAPIView.as_view(), name="history_page"),
    path("account", IndexPageAPIView.as_view(), name="account_page"),
    path("forget_password", IndexPageAPIView.as_view(), name="forget_password_page"),
    # Catch-all to serve the React app for any other /view/* route
    re_path(r"^(?:.*)/?$", IndexPageAPIView.as_view(), name="frontend_catchall"),
]
