import React, { createContext, type ReactNode, useState } from "react";

import type { User } from "firebase/auth";

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
  const [user] = useState<User | null>(null);

  return (
    <FirebaseAuthContext.Provider value={{ user }}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}
