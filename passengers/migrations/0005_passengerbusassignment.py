from django.db import migrations, models


def forwards(apps, schema_editor):
    Passenger = apps.get_model("passengers", "Passenger")
    Assignment = apps.get_model("passengers", "PassengerBusAssignment")
    db_alias = schema_editor.connection.alias

    for passenger in Passenger.objects.using(db_alias).exclude(
        original_bus__isnull=True
    ):
        Assignment.objects.using(db_alias).update_or_create(
            passenger_id=passenger.id,
            defaults={
                "trip_id": passenger.trip_id,
                "trip_bus_id": passenger.original_bus_id,
            },
        )


def reverse(apps, schema_editor):
    Assignment = apps.get_model("passengers", "PassengerBusAssignment")
    Assignment.objects.using(schema_editor.connection.alias).all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ("passengers", "0004_passengertransfer"),
        ("trips", "0002_add_driver_to_tripbus"),
    ]

    operations = [
        migrations.CreateModel(
            name="PassengerBusAssignment",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "passenger",
                    models.ForeignKey(
                        on_delete=models.CASCADE,
                        related_name="bus_assignments",
                        to="passengers.passenger",
                    ),
                ),
                (
                    "trip",
                    models.ForeignKey(
                        on_delete=models.CASCADE,
                        related_name="passenger_assignments",
                        to="trips.trip",
                    ),
                ),
                (
                    "trip_bus",
                    models.ForeignKey(
                        on_delete=models.CASCADE,
                        related_name="passenger_assignments",
                        to="trips.tripbus",
                    ),
                ),
            ],
            options={
                "ordering": ["trip", "trip_bus", "passenger"],
            },
        ),
        migrations.AddIndex(
            model_name="passengerbusassignment",
            index=models.Index(
                fields=["trip", "trip_bus"], name="passengerb_trip_tr_4d7a0f_idx"
            ),
        ),
        migrations.RunPython(forwards, reverse),
        migrations.RemoveField(
            model_name="passenger",
            name="original_bus",
        ),
    ]
