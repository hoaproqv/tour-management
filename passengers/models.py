from django.db import models


class Passenger(models.Model):
    id = models.BigAutoField(primary_key=True)
    trip = models.ForeignKey(
        "trips.Trip",
        on_delete=models.CASCADE,
        related_name="passengers",
    )
    original_bus = models.ForeignKey(
        "trips.TripBus",
        on_delete=models.SET_NULL,
        related_name="original_passengers",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=30, blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["trip", "name"]),
        ]

    def __str__(self) -> str:
        return self.name


class PassengerTransfer(models.Model):
    id = models.BigAutoField(primary_key=True)
    passenger = models.OneToOneField(
        Passenger,
        on_delete=models.CASCADE,
        related_name="transfer",
    )
    from_trip_bus = models.ForeignKey(
        "trips.TripBus",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transfers_from",
    )
    to_trip_bus = models.ForeignKey(
        "trips.TripBus",
        on_delete=models.CASCADE,
        related_name="transfers_to",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.passenger} -> {self.to_trip_bus}"
