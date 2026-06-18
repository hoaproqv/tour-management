from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Notification
from .services import (
    publish_mqtt_notification,
    send_firebase_push_notification,
)


@receiver(post_save, sender=Notification)
def send_notification_events(sender, instance, created, **kwargs):
    if created:
        user = instance.user

        # 1. Gửi qua MQTT cho ứng dụng đang chạy (WebSockets)
        if user.receive_in_app_notifications:
            publish_mqtt_notification(instance.id)

        # 2. Gửi qua Firebase (Push Notification) cho màn hình khóa
        if user.receive_device_notifications:
            send_firebase_push_notification(user.id, instance.title, instance.message)

        # 3. Gửi qua Email
        if user.receive_email_notifications and user.email:
            from .services import send_email_notification
            send_email_notification(user.email, instance.title, instance.message)
