from django.urls import path

from accounts import views


urlpatterns = [
    path("auth/register", views.RegisterView.as_view(), name="auth-register"),
    path("auth/login", views.LoginView.as_view(), name="auth-login"),
    path("auth/me", views.MeView.as_view(), name="auth-me"),
    path("auth/refresh", views.refresh_token, name="auth-refresh"),
    path("auth/csrf", views.csrf_token, name="auth-csrf"),
]
