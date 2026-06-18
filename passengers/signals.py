from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import Passenger, PassengerTransfer, PassengerBusAssignment
from notifications.models import Notification

@receiver(pre_save, sender=PassengerTransfer)
def passenger_transfer_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = PassengerTransfer.objects.get(pk=instance.pk)
            instance._old_to_trip_bus_id = old_instance.to_trip_bus_id
            instance._old_from_trip_bus_id = old_instance.from_trip_bus_id
        except PassengerTransfer.DoesNotExist:
            instance._old_to_trip_bus_id = None
            instance._old_from_trip_bus_id = None
    else:
        instance._old_to_trip_bus_id = None
        instance._old_from_trip_bus_id = None

@receiver(post_save, sender=PassengerTransfer)
def passenger_transfer_post_save(sender, instance, created, **kwargs):
    if instance.trip.status == 'doing':
        old_to_trip_bus_id = getattr(instance, '_old_to_trip_bus_id', None)
        
        passenger_name = instance.passenger.name
        
        # If to_trip_bus changed, or it was just created
        if created or old_to_trip_bus_id != instance.to_trip_bus_id:
            if instance.to_trip_bus:
                manager = instance.to_trip_bus.manager
                driver = instance.to_trip_bus.driver
                if manager:
                    Notification.objects.create(
                        user=manager,
                        title="Hành khách chuyển đến",
                        message=f"Hành khách {passenger_name} vừa được chuyển SANG xe của bạn",
                        type='INFO',
                        reference_type='PASSENGER',
                        reference_id=str(instance.passenger.id)
                    )
                if driver:
                    Notification.objects.create(
                        user=driver,
                        title="Hành khách chuyển đến",
                        message=f"Có thêm thành viên {passenger_name} vào xe của bạn",
                        type='INFO',
                        reference_type='PASSENGER',
                        reference_id=str(instance.passenger.id)
                    )
                    
            if instance.from_trip_bus:
                manager = instance.from_trip_bus.manager
                driver = instance.from_trip_bus.driver
                if manager:
                    Notification.objects.create(
                        user=manager,
                        title="Hành khách chuyển đi",
                        message=f"Hành khách {passenger_name} đã chuyển KHỎI xe của bạn",
                        type='WARNING',
                        reference_type='PASSENGER',
                        reference_id=str(instance.passenger.id)
                    )
                if driver:
                    Notification.objects.create(
                        user=driver,
                        title="Hành khách chuyển đi",
                        message=f"Hành khách {passenger_name} đã chuyển KHỎI xe của bạn",
                        type='WARNING',
                        reference_type='PASSENGER',
                        reference_id=str(instance.passenger.id)
                    )
