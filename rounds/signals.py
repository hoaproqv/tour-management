from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender="rounds.Round")
def create_round_buses_for_round(sender, instance, created, **kwargs):
    """When a Round is created, ensure a RoundBus exists for each TripBus in the trip."""
    if not created:
        return

    from rounds.models import RoundBus
    from trips.models import TripBus

    trip_buses = TripBus.objects.filter(trip=instance.trip)
    for tb in trip_buses:
        RoundBus.objects.get_or_create(
            trip_bus=tb,
            round=instance,
        )

@receiver(post_save, sender="trips.Trip")
def create_initial_round_for_trip(sender, instance, created, **kwargs):
    """When a Trip is created, ensure an initial Round exists."""
    if not created:
        return

    from rounds.models import Round
    Round.objects.create(
        trip=instance,
        name="Tập trung và xuất phát",
        location="",
        sequence=1,
    )
