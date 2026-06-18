from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Notification
from .serializers import NotificationSerializer
from .services import publish_mqtt_notification, send_firebase_push_notification

@receiver(post_save, sender=Notification)
def send_notification_events(sender, instance, created, **kwargs):
    if created:
        data = NotificationSerializer(instance).data
        
        # 1. Gửi qua MQTT cho ứng dụng đang chạy (WebSockets)
        publish_mqtt_notification(instance.id)
        
        # 2. Gửi qua Firebase (Push Notification) cho màn hình khóa
        send_firebase_push_notification(instance.user.id, instance.title, instance.message)
