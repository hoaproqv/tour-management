import { useEffect, useState } from "react";

import { onValue, ref } from "firebase/database";

import { db_firebase } from "../utils/firebaseConfig";

export default function useSubscribeMessage(messageId: string | null) {
  const [message, setMessage] = useState(null);
  const boardId = process.env.FIREBASE_BOARD_ID;

  useEffect(() => {
    if (!messageId) return;

    const account = JSON.parse(localStorage.getItem("account") || "{}");
    const mt5Username = account.username;

    const messageRef = ref(
      db_firebase,
      `${boardId}/${mt5Username}/${messageId}`,
    );

    const unsubscribe = onValue(messageRef, (snapshot) => {
      const messageData = snapshot.val();
      let parsedMessage: any = null;

      try {
        if (!messageData) {
          throw new Error("messageData is null or undefined");
        }

        // Nếu messageData là string thì parse, nếu là object/array thì giữ nguyên
        const data =
          typeof messageData === "string"
            ? JSON.parse(messageData)
            : messageData;

        if (!data || typeof data !== "object") {
          throw new Error("Parsed data is not an object");
        }

        parsedMessage = data;
      } catch (e) {
        console.error("Error parsing messageData:", e);
      }

      // Luôn cập nhật message khi có dữ liệu mới
      setMessage(parsedMessage);
    });

    return () => unsubscribe();
  }, [boardId, messageId]);

  return { message };
}
