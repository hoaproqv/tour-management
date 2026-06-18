"""
Auto-create RoundBus records for every Round in the trip
whenever a TripBus is created.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from notifications.models import Notification


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


@receiver(pre_save, sender="trips.TripBus")
def trip_bus_pre_save(sender, instance, **kwargs):
    if instance.pk:
        from .models import TripBus
        try:
            old_instance = TripBus.objects.get(pk=instance.pk)
            instance._old_manager_id = old_instance.manager_id
            instance._old_driver_id = old_instance.driver_id
        except TripBus.DoesNotExist:
            instance._old_manager_id = None
            instance._old_driver_id = None
    else:
        instance._old_manager_id = None
        instance._old_driver_id = None


@receiver(post_save, sender="trips.TripBus")
def trip_bus_assignment_notification(sender, instance, created, **kwargs):
    old_manager_id = getattr(instance, '_old_manager_id', None)
    old_driver_id = getattr(instance, '_old_driver_id', None)

    if created or old_manager_id != instance.manager_id:
        if instance.manager:
            Notification.objects.create(
                user=instance.manager,
                title="Phân công trưởng xe",
                message=f"Bạn đã được phân công làm trưởng xe {instance.bus.registration_number} cho chuyến {instance.trip.name}",
                type='INFO',
                reference_type='TRIP',
                reference_id=str(instance.trip.id)
            )

    if created or old_driver_id != instance.driver_id:
        if instance.driver:
            Notification.objects.create(
                user=instance.driver,
                title="Phân công lái xe",
                message=f"Bạn đã được phân công lái xe {instance.bus.registration_number} cho chuyến {instance.trip.name}",
                type='INFO',
                reference_type='TRIP',
                reference_id=str(instance.trip.id)
            )
