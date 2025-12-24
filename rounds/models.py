import uuid

from django.db import models


class Round(models.Model):
    class Status(models.TextChoices):
        PLANNED = "planned", "Planned"
        DOING = "doing", "Doing"
        DONE = "done", "Done"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip = models.ForeignKey(
        "trips.Trip",
        on_delete=models.CASCADE,
        related_name="rounds",
    )
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    sequence = models.PositiveIntegerField(help_text="Order of this round within the trip")
    estimate_time = models.DateTimeField()
    actual_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PLANNED,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["trip", "sequence"]
        unique_together = ("trip", "sequence")

    def __str__(self) -> str:
        return f"{self.trip.name} - {self.name}"


class RoundBus(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip_bus = models.ForeignKey(
        "trips.TripBus",
        on_delete=models.CASCADE,
        related_name="round_buses",
    )
    round = models.ForeignKey(
        Round,
        on_delete=models.CASCADE,
        related_name="round_buses",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("round", "trip_bus")
        ordering = ["round", "trip_bus"]

    def __str__(self) -> str:
        return f"{self.round} - {self.trip_bus.bus}"
