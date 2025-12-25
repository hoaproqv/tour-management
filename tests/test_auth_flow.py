import pytest
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_auth_flow_register_login_refresh_me():
    client = APIClient()

    # Register
    resp = client.post(
        reverse("auth-register"),
        {
            "username": "u1",
            "email": "u1@example.com",
            "name": "User 1",
            "password": "secret123",
        },
        format="json",
    )
    assert resp.status_code == 201

    # Login
    resp = client.post(
        reverse("auth-login"),
        {"username": "u1", "password": "secret123"},
        format="json",
    )
    assert resp.status_code == 200
    tokens = resp.json()["data"]["tokens"]

    # Me with access token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    resp = client.get(reverse("auth-me"))
    assert resp.status_code == 200

    # Refresh
    resp = client.post(
        reverse("auth-refresh"), {"refresh": tokens["refresh"]}, format="json"
    )
    assert resp.status_code == 200
    assert "access" in resp.json()["data"]["tokens"]
