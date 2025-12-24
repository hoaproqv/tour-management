from django.urls import path

from core.views import IndexPageAPIView

urlpatterns = [
    path("login", IndexPageAPIView.as_view(), name="login_page"),
    path("manage-order", IndexPageAPIView.as_view(), name="order_page"),
    path("history", IndexPageAPIView.as_view(), name="history_page"),
    path("account", IndexPageAPIView.as_view(), name="account_page"),
    path("forget_password", IndexPageAPIView.as_view(), name="forget_password_page"),
]
