from django.urls import path

from accounts import views

urlpatterns = [
    path("auth/register", views.RegisterView.as_view(), name="auth-register"),
    path("auth/login", views.LoginView.as_view(), name="auth-login"),
    path("auth/me", views.MeView.as_view(), name="auth-me"),
    path("auth/change-password", views.ChangePasswordView.as_view(), name="auth-change-password"),
    path("auth/forgot-password", views.ForgotPasswordView.as_view(), name="auth-forgot-password"),
    path("auth/reset-password", views.ResetPasswordView.as_view(), name="auth-reset-password"),
    path("auth/check-password", views.CheckPasswordView.as_view(), name="auth-check-password"),
    path("auth/refresh", views.refresh_token, name="auth-refresh"),
    path("auth/csrf", views.csrf_token, name="auth-csrf"),
    path("roles/", views.RoleListView.as_view(), name="role-list"),
    path("users/bulk-delete/", views.UserBulkDeleteView.as_view(), name="user-bulk-delete"),
    path("users/", views.UserListCreateView.as_view(), name="user-list-create"),
    path("users/<int:pk>/", views.UserDetailView.as_view(), name="user-detail"),
    path("tenants/bulk-delete/", views.TenantBulkDeleteView.as_view(), name="tenant-bulk-delete"),
    path("tenants/", views.TenantListCreateView.as_view(), name="tenant-list-create"),
    path("tenants/<int:pk>/", views.TenantDetailView.as_view(), name="tenant-detail"),
]
