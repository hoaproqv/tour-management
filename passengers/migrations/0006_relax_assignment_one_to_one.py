from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("passengers", "0005_passengerbusassignment"),
    ]

    operations = [
        migrations.AlterField(
            model_name="passengerbusassignment",
            name="passenger",
            field=models.ForeignKey(
                on_delete=models.CASCADE,
                related_name="bus_assignments",
                to="passengers.passenger",
            ),
        ),
        migrations.AddConstraint(
            model_name="passengerbusassignment",
            constraint=models.UniqueConstraint(
                fields=["passenger", "trip"],
                name="unique_passenger_per_trip_assignment",
            ),
        ),
    ]
