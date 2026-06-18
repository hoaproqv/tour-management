// Import and configure the Firebase SDK
// These scripts are made available when the app is served or bundled
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBrZBLqoJxzjJFC_opOTVmobnvRujyTMjU",
  authDomain: "tour-management-def8a.firebaseapp.com",
  projectId: "tour-management-def8a",
  storageBucket: "tour-management-def8a.firebasestorage.app",
  messagingSenderId: "508133873566",
  appId: "1:508133873566:web:ed5d824863d38a7e14688f"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || "Thông báo mới";
  const notificationOptions = {
    body: payload.notification.body
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
