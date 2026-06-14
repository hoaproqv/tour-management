from django.db import models


class Bus(models.Model):
    id = models.BigAutoField(primary_key=True)
    tenant = models.ForeignKey(
        "accounts.Tenant",
        on_delete=models.CASCADE,
        related_name="buses",
        null=True,
        blank=True,
        help_text="Tenant that owns this bus. Null for shared/global buses (legacy).",
    )
    registration_number = models.CharField(max_length=50, unique=True)
    bus_code = models.CharField(max_length=50, unique=True)
    capacity = models.PositiveIntegerField()
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["registration_number"]

    def __str__(self) -> str:
        return f"{self.registration_number} ({self.capacity})"
