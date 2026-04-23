"""
Auto-create RoundBus records for every Round in the trip
whenever a TripBus is created.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender="trips.TripBus")
def create_round_buses_for_trip_bus(sender, instance, created, **kwargs):
    """When a TripBus is created, ensure a RoundBus exists for each Round in the trip."""
    if not created:
        return

    from rounds.models import Round, RoundBus

    rounds = Round.objects.filter(trip=instance.trip)
    for rnd in rounds:
        RoundBus.objects.get_or_create(
            trip_bus=instance,
            round=rnd,
        )
