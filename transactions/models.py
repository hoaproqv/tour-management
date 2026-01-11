from django.db import models


class Transaction(models.Model):
    id = models.BigAutoField(primary_key=True)
    passenger = models.ForeignKey(
        "passengers.Passenger",
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    round_bus = models.ForeignKey(
        "rounds.RoundBus",
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    check_in = models.DateTimeField()
    check_out = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-check_in"]
        indexes = [
            models.Index(fields=["passenger", "round_bus"]),
        ]

    def __str__(self) -> str:
        return f"{self.passenger} - {self.round_bus}"
