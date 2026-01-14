from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("passengers", "0003_remove_passenger_seat_number"),
        ("trips", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="PassengerTransfer",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "from_trip_bus",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=models.deletion.SET_NULL,
                        related_name="transfers_from",
                        to="trips.tripbus",
                    ),
                ),
                (
                    "passenger",
                    models.OneToOneField(
                        on_delete=models.deletion.CASCADE,
                        related_name="transfer",
                        to="passengers.passenger",
                    ),
                ),
                (
                    "to_trip_bus",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="transfers_to",
                        to="trips.tripbus",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
