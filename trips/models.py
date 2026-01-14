from django.conf import settings
from django.db import models


class Trip(models.Model):
    class Status(models.TextChoices):
        PLANNED = "planned", "Planned"
        DOING = "doing", "Doing"
        DONE = "done", "Done"

    id = models.BigAutoField(primary_key=True)
    tenant = models.ForeignKey(
        "accounts.Tenant",
        on_delete=models.CASCADE,
        related_name="trips",
    )
    name = models.CharField(max_length=255)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PLANNED,
    )
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date", "name"]

    def __str__(self) -> str:
        return self.name


class TripBus(models.Model):
    id = models.BigAutoField(primary_key=True)
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="managed_buses",
    )
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="driven_buses",
        null=True,
        blank=True,
    )
    bus = models.ForeignKey(
        "fleet.Bus",
        on_delete=models.CASCADE,
        related_name="trip_buses",
    )
    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name="trip_buses",
    )
    driver_name = models.CharField(max_length=255)
    driver_tel = models.CharField(max_length=30)
    tour_guide_name = models.CharField(max_length=255, blank=True)
    tour_guide_tel = models.CharField(max_length=30, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("trip", "bus")
        ordering = ["trip", "bus"]

    def __str__(self) -> str:
        return f"{self.trip.name} - {self.bus.registration_number}"
