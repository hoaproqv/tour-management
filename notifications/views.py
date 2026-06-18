from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'read'})

    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({'status': 'all_read'})

    @action(detail=False, methods=['post'])
    def register_device(self, request):
        token = request.data.get('token')
        if token:
            from .models import FCMDevice
            FCMDevice.objects.get_or_create(user=request.user, token=token)
            return Response({'status': 'registered'})
        return Response({'error': 'Token is required'}, status=400)
        
    @action(detail=False, methods=['post'])
    def test_notification(self, request):
        # Demo endpoint để test bắn thông báo
        notification = Notification.objects.create(
            user=request.user,
            title="Thông báo Test Demo",
            message="Đây là thông báo test từ hệ thống. Nếu bạn thấy cái này nghĩa là MQTT và FCM hoạt động tốt!",
            type="SUCCESS",
            reference_type="REPORT",
            reference_id="TEST01"
        )
        return Response({'status': 'sent', 'id': notification.id})
