import json
import logging
import os

import firebase_admin
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from firebase_admin import credentials, messaging
from paho.mqtt import publish

logger = logging.getLogger(__name__)


def publish_mqtt_notification(notification_id):
    try:
        from .models import Notification
        notification = Notification.objects.get(id=notification_id)

        user_id = notification.user.id
        topic = f"notifications/user_{user_id}"

        payload = {
            'type': 'new_notification',
            'data': {
                'id': str(notification.id),
                'type': notification.type,
                'title': notification.title,
                'message': notification.message,
                'reference_type': notification.reference_type,
                'reference_id': str(notification.reference_id) if notification.reference_id else "",
                'is_read': notification.is_read,
                'created_at': notification.created_at.isoformat()
            }
        }

        if not settings.MQTT_URL:
            logger.warning("MQTT_URL not configured, skipping publish")
            return

        mqtt_url = settings.MQTT_URL.replace("wss://", "").replace("ws://", "")
        if ":" in mqtt_url:
            host, port = mqtt_url.rsplit(":", 1)
            port = int(port)
        else:
            host = mqtt_url
            port = 8883 if settings.MQTT_URL.startswith("wss") else 1883

        auth = None
        if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
            auth = {
                "username": settings.MQTT_USERNAME,
                "password": settings.MQTT_PASSWORD,
            }

        publish.single(
            topic,
            payload=json.dumps(payload),
            hostname=host,
            port=port,
            auth=auth,
            tls={} if settings.MQTT_URL.startswith("wss") else None,
            transport="websockets" if settings.MQTT_URL.startswith("ws") else "tcp",
        )

        logger.info(f"Published MQTT notification to {topic}")
    except Exception as e:
        logger.error(f"Failed to publish MQTT notification: {str(e)}")


def notify_users_by_role(tenant_id, roles, title, message, reference_type="", reference_id=""):
    """
    Tạo notification cho tất cả user thuộc một tenant và có role nằm trong list `roles`.
    """
    from accounts.models import User

    from .models import Notification

    users = User.objects.filter(role__name__in=roles, is_active=True)
    if tenant_id:
        users = users.filter(tenant_id=tenant_id)

    for user in users:
        Notification.objects.create(
            user=user,
            title=title,
            message=message,
            type='INFO',
            reference_type=reference_type,
            reference_id=reference_id
        )


def get_firebase_app():
    if not firebase_admin._apps:  # pylint: disable=protected-access
        cred_path = os.getenv("FIREBASE_CREDENTIALS", "firebase-key.json")
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            return True

        logger.warning(f"Firebase credentials not found at {cred_path}")
        return False
    return True


def send_firebase_push_notification(user_id, title, message):
    if not get_firebase_app():
        return

    from .models import FCMDevice
    devices = FCMDevice.objects.filter(user_id=user_id)
    if not devices.exists():
        return

    for device in devices:
        try:
            msg = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=message,
                ),
                token=device.token,
            )
            messaging.send(msg)
            logger.info(f"FCM push sent to {device.token[:10]}...")
        except Exception as e:
            logger.error(f"FCM push failed for {device.token[:10]}: {e}")
            # Xóa token nếu bị lỗi (do đã hết hạn hoặc user uninstall app)
            if "Requested entity was not found" in str(e) or "The registration token is not a valid FCM registration token" in str(e):
                device.delete()


def send_email_notification(email, title, message):
    if not email:
        return

    try:
        subject = f"[GoTrip] {title}"
        context = {
            'title': title,
            'message': message,
        }
        html_content = render_to_string('notifications/email_notification.html', context)
        text_content = strip_tags(html_content)

        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=True)
        logger.info(f"Email notification sent to {email}")
    except Exception as e:
        logger.error(f"Failed to send email notification to {email}: {e}")
