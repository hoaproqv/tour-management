from django.db import models


class Bus(models.Model):
    id = models.BigAutoField(primary_key=True)
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
