import React, {
  createContext,
  type ReactNode,
  useEffect,
  useState,
} from "react";

import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  type User,
} from "firebase/auth";

import { app } from "../utils/firebaseConfig";

interface FirebaseAuthContextType {
  user: User | null;
}

export const FirebaseAuthContext =
  createContext<FirebaseAuthContextType | null>(null);

export default function FirebaseAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const auth = getAuth(app);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Đã đăng nhập (kể cả ẩn danh), sử dụng lại
        setUser(currentUser);
      } else {
        // Chưa đăng nhập, tiến hành đăng nhập ẩn danh
        try {
          const { user: newUser } = await signInAnonymously(auth);
          setUser(newUser);
        } catch (error) {
          console.error("Error signing in anonymously:", error);
        }
      }
    });

    return () => unsubscribe(); // cleanup listener
  }, []);

  return (
    <FirebaseAuthContext.Provider value={{ user }}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}
