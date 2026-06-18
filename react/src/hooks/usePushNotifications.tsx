import React, { useEffect } from "react";

import { notification, message, Modal } from "antd";
import { getToken, onMessage } from "firebase/messaging";

import axiosInstance from "../api/axiosInstance";
import { messaging } from "../firebase";

export function usePushNotifications() {
  useEffect(() => {
    const requestPermissionAndGetToken = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          // Register service worker pointing to root
          const registration = await navigator.serviceWorker.register(
            "/firebase-messaging-sw.js",
          );

          const currentToken = await getToken(messaging, {
            vapidKey: process.env.VITE_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
          });

          if (currentToken) {
            console.log("FCM Token:", currentToken);
            // Gửi Token lên Backend
            try {
              await axiosInstance.post("/notifications/register_device/", {
                token: currentToken,
              });
              console.log("Đã gửi FCM Token lên Server");
            } catch (err: any) {
              console.error("Lỗi gửi FCM Token:", err);
              message.error(
                "Lỗi kết nối Backend FCM: " + (err.message || "Unknown error"),
              );
            }
          } else {
            console.warn(
              "Không có Registration Token nào khả dụng. Yêu cầu permission để khởi tạo token.",
            );
            message.warning(
              "Không tạo được Token từ Firebase. Vui lòng kiểm tra lại cấu hình!",
            );
          }
        } else {
          console.warn("Người dùng đã từ chối quyền gửi Notification.");
          Modal.warning({
            title: "Quyền thông báo bị chặn!",
            content: (
              <div>
                <p>
                  Bạn vừa từ chối nhận thông báo. Để nhận thông báo chuyến đi
                  sau này, bạn cần bật lại quyền trong cài đặt trình duyệt:
                </p>
                <ol className="mt-2 text-sm">
                  <li>Bấm vào biểu tượng ổ khóa 🔒 cạnh thanh địa chỉ.</li>
                  <li>
                    Tìm mục <b>Thông báo (Notifications)</b>.
                  </li>
                  <li>
                    Chuyển sang <b>Cho phép (Allow)</b>.
                  </li>
                  <li>Tải lại trang (F5).</li>
                </ol>
              </div>
            ),
            okText: "Đã hiểu",
          });
        }
      } catch (error: any) {
        console.error("Lỗi khi xin quyền Notification hoặc lấy Token:", error);
        message.error(
          "Lỗi khởi tạo Firebase: " + (error.message || "Lỗi không xác định"),
        );
      }
    };

    if (Notification.permission === "default") {
      // Trình duyệt chưa từng hỏi, nên ta hiện 1 thông báo nhỏ mời bấm
      notification.info({
        message: "Nhận thông báo chuyến đi",
        description:
          "Bạn có muốn nhận thông báo (Push Notification) khi có cập nhật điểm danh hoặc chuyến đi không?",
        btn: (
          <div
            onClick={() => {
              notification.destroy("push-prompt");
              requestPermissionAndGetToken();
            }}
            className="cursor-pointer text-blue-500 font-bold px-3 py-1 bg-blue-50 rounded"
          >
            Bật Thông Báo
          </div>
        ),
        key: "push-prompt",
        duration: 0, // Không tự động tắt
        placement: "bottomRight",
      });
    } else if (Notification.permission === "granted") {
      // Nếu đã từng cấp quyền rồi thì cứ thế lấy token ngầm
      requestPermissionAndGetToken();
    } else if (Notification.permission === "denied") {
      // Nhắc nhở người dùng nếu họ đã từng chặn
      Modal.warning({
        title: "Trình duyệt đang chặn thông báo!",
        content: (
          <div>
            <p>
              Hệ thống không thể gửi thông báo vì trình duyệt của bạn đang chặn
              quyền.
            </p>
            <ol className="mt-2 text-sm">
              <li>Bấm vào biểu tượng ổ khóa 🔒 cạnh thanh địa chỉ.</li>
              <li>
                Tìm mục <b>Thông báo (Notifications)</b>.
              </li>
              <li>
                Chuyển sang <b>Cho phép (Allow)</b>.
              </li>
              <li>Tải lại trang (F5).</li>
            </ol>
          </div>
        ),
        okText: "Đã hiểu",
      });
    }

    // Lắng nghe Message khi ứng dụng đang chạy trên màn hình (Foreground)
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Nhận Message Foreground: ", payload);
      const title = payload.notification?.title || "Thông báo";
      const body = payload.notification?.body || "";

      notification.info({
        message: title,
        description: body,
        placement: "topRight",
        duration: 5,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);
}
