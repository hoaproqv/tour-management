from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from notifications.services import notify_users_by_role


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
    """(Removed) We no longer auto-create rounds in DB when a trip is created. UI handles this."""
    pass


@receiver(pre_save, sender="rounds.RoundBus")
def round_bus_pre_save(sender, instance, **kwargs):
    if instance.pk:
        from .models import RoundBus
        try:
            old_instance = RoundBus.objects.get(pk=instance.pk)
            instance._old_finalized_at = old_instance.finalized_at
            instance._old_checkout_finalized_at = old_instance.checkout_finalized_at
        except RoundBus.DoesNotExist:
            instance._old_finalized_at = None
            instance._old_checkout_finalized_at = None
    else:
        instance._old_finalized_at = None
        instance._old_checkout_finalized_at = None


@receiver(post_save, sender="rounds.RoundBus")
def round_bus_post_save(sender, instance, created, **kwargs):
    old_finalized_at = getattr(instance, '_old_finalized_at', None)
    old_checkout_finalized_at = getattr(instance, '_old_checkout_finalized_at', None)

    manager = instance.trip_bus.manager
    manager_name = manager.name if manager else "Ai đó"
    bus_reg = instance.trip_bus.bus.registration_number
    tenant_id = instance.round.trip.tenant_id

    if instance.finalized_at and not old_finalized_at:
        notify_users_by_role(
            tenant_id=tenant_id,
            roles=['tour_manager'],
            title="Chốt sổ điểm danh lên xe",
            message=f"Trưởng xe {manager_name} đã chốt sổ điểm danh lên xe {bus_reg} ở chặng '{instance.round.name}'",
            reference_type='ROUND',
            reference_id=str(instance.round.id)
        )

    if instance.checkout_finalized_at and not old_checkout_finalized_at:
        notify_users_by_role(
            tenant_id=tenant_id,
            roles=['tour_manager'],
            title="Chốt sổ điểm danh xuống xe",
            message=f"Trưởng xe {manager_name} đã chốt sổ điểm danh xuống xe {bus_reg} ở chặng '{instance.round.name}'",
            reference_type='ROUND',
            reference_id=str(instance.round.id)
        )
