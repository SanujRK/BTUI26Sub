import { useEffect, useMemo, useState } from "react";
import { getCurrentUser, onAuthStateChange, type User } from "../lib/auth";

const CACHE_KEY = "btui.currentUser";

const EMPTY = () => undefined;

function readCachedUser(): User | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { user: User } | null;
    return parsed?.user ?? null;
  } catch {
    return null;
  }
}

function cacheUser(user: User | null): void {
  try {
    if (user) {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ user }));
    } else {
      sessionStorage.removeItem(CACHE_KEY);
    }
  } catch {
    
  }
}

export function useUser() {
  const cached = useMemo(readCachedUser, []);
  const [user, setUser] = useState<User | null>(cached);
  const [loading, setLoading] = useState(cached === null);

  useEffect(() => {
    getCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);
      cacheUser(u);
    });
    const unsubscribe = onAuthStateChange((u) => {
      setUser(u);
      setLoading(false);
      cacheUser(u);
    });
    return unsubscribe ?? EMPTY;
  }, []);

  return { user, loading };
}