import mqtt from "mqtt";

export interface INotification {
  id: string;
  type: "INFO" | "WARNING" | "SUCCESS" | "ERROR";
  title: string;
  message: string;
  reference_type: string;
  reference_id: string;
  is_read: boolean;
  created_at: string;
}

type Listener = (_notifications: INotification[]) => void;

class NotificationService {
  private notifications: INotification[] = [];
  private listeners: Listener[] = [];
  private mqttClient: import("mqtt").MqttClient | null = null;
  private currentUserId: string | number | null = null;

  constructor() {
    // Start with empty data, wait for real data
    this.notifications = [];
  }

  // Observer Pattern: Subscribe to changes
  subscribe(listener: Listener) {
    this.listeners.push(listener);
    // Immediately emit current state to new subscriber
    listener(this.notifications);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // Notify all observers
  private notify() {
    this.listeners.forEach((listener) => listener(this.notifications));
  }

  public async initMqtt(userId: string | number) {
    if (this.currentUserId === userId) return; // Already initialized for this user
    this.currentUserId = userId;

    // @ts-ignore
    const MQTT_URL = process.env.MQTT_URL || process.env.REACT_APP_MQTT_URL;
    // @ts-ignore
    const MQTT_USERNAME =
      process.env.MQTT_USERNAME || process.env.REACT_APP_MQTT_USERNAME;
    // @ts-ignore
    const MQTT_PASSWORD =
      process.env.MQTT_PASSWORD || process.env.REACT_APP_MQTT_PASSWORD;

    if (!MQTT_URL) {
      console.warn("MQTT URL not found for notifications");
      return;
    }

    try {
      if (this.mqttClient) {
        this.mqttClient.end();
      }

      this.mqttClient = mqtt.connect(MQTT_URL, {
        username: MQTT_USERNAME,
        password: MQTT_PASSWORD,
      });

      const topic = `notifications/user_${userId}`;

      this.mqttClient?.on("connect", () => {
        console.log("✓ Notifications MQTT connected");
        this.mqttClient?.subscribe(topic);
      });

      this.mqttClient?.on("message", (msgTopic, payload) => {
        if (msgTopic === topic) {
          try {
            const data = JSON.parse(payload.toString());
            if (data.type === "new_notification" && data.data) {
              this.receiveNewNotification(data.data);
            }
          } catch (err) {
            console.error("Failed to parse notification payload", err);
          }
        }
      });
    } catch (e) {
      console.error("Failed to initialize MQTT for notifications", e);
    }
  }

  public registerFCMToken(token: string) {
    // Gửi token lên backend
    // Mẫu: api.post('/api/notifications/register_device/', { token })
    console.log("FCM Token ready to be registered to API:", token);
  }

  // Method to be called by WebSocket when new data arrives
  receiveNewNotification(notification: INotification) {
    // Only add if not exist to prevent duplicates
    if (!this.notifications.find((n) => n.id === notification.id)) {
      this.notifications = [notification, ...this.notifications];
      this.notify();
    }
  }

  markAsRead(id: string) {
    // Gọi API update lên Backend
    // Mẫu: api.post(`/api/notifications/${id}/mark_as_read/`)
    this.notifications = this.notifications.map((n) =>
      n.id === id ? { ...n, is_read: true } : n,
    );
    this.notify();
  }

  markAllAsRead() {
    // Gọi API update lên Backend
    // Mẫu: api.post('/api/notifications/mark_all_as_read/')
    this.notifications = this.notifications.map((n) => ({
      ...n,
      is_read: true,
    }));
    this.notify();
  }
}

// Export a singleton instance
export const notificationService = new NotificationService();
