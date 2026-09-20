import { useEffect, useState } from "react";
import { getCurrentUser, onAuthStateChange, type User } from "../lib/auth";

const EMPTY = () => undefined;

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
    const unsubscribe = onAuthStateChange((u) => setUser(u));
    return unsubscribe ?? EMPTY;
  }, []);

  return { user, loading };
}