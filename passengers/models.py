from django.db import models


class Passenger(models.Model):
    id = models.BigAutoField(primary_key=True)
    tenant = models.ForeignKey(
        "accounts.Tenant",
        on_delete=models.CASCADE,
        related_name="passengers",
    )
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=30, blank=True)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["tenant", "name"]),
        ]

    def __str__(self) -> str:
        return self.name


class ImportedBus(models.Model):
    """Draft bus created during Excel import.
    After the user maps it to a real Bus entity, mapped_bus is set
    and a TripBus record is created automatically.
    """

    id = models.BigAutoField(primary_key=True)
    trip = models.ForeignKey(
        "trips.Trip",
        on_delete=models.CASCADE,
        related_name="imported_buses",
    )
    sheet_name = models.CharField(max_length=255)
    sequence = models.PositiveIntegerField(default=1)
    mapped_bus = models.ForeignKey(
        "fleet.Bus",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="imported_buses",
    )
    mapped_trip_bus = models.ForeignKey(
        "trips.TripBus",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="imported_bus_sources",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["trip", "sequence"]
        unique_together = [("trip", "sheet_name")]

    def __str__(self) -> str:
        status = f" → {self.mapped_bus}" if self.mapped_bus else " (unmapped)"
        return f"{self.trip.name} / {self.sheet_name}{status}"


class PassengerBusAssignment(models.Model):
    id = models.BigAutoField(primary_key=True)
    passenger = models.ForeignKey(
        Passenger,
        on_delete=models.CASCADE,
        related_name="bus_assignments",
    )
    trip = models.ForeignKey(
        "trips.Trip",
        on_delete=models.CASCADE,
        related_name="passenger_assignments",
    )
    trip_bus = models.ForeignKey(
        "trips.TripBus",
        on_delete=models.CASCADE,
        related_name="passenger_assignments",
        null=True,
        blank=True,
    )
    imported_bus = models.ForeignKey(
        ImportedBus,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="passenger_assignments",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["trip", "trip_bus", "passenger"]
        indexes = [
            models.Index(fields=["trip", "trip_bus"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["passenger", "trip"],
                name="unique_passenger_per_trip_assignment",
            ),
        ]

    def __str__(self) -> str:
        if self.trip_bus_id:
            return f"{self.passenger} -> {self.trip_bus}"
        return f"{self.passenger} -> {self.imported_bus} (draft)"


class PassengerTransfer(models.Model):
    id = models.BigAutoField(primary_key=True)
    passenger = models.ForeignKey(
        Passenger,
        on_delete=models.CASCADE,
        related_name="transfers",
    )
    trip = models.ForeignKey(
        "trips.Trip",
        on_delete=models.CASCADE,
        related_name="passenger_transfers",
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
        constraints = [
            models.UniqueConstraint(
                fields=["passenger", "trip"],
                name="unique_passenger_transfer_per_trip",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.passenger} -> {self.to_trip_bus}"
