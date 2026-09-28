import { useEffect } from "react";
import { useUser } from "../hooks/useUser";

export default function RedirectIfSignedIn() {
  const { user } = useUser();

  useEffect(() => {
    if (user) window.location.assign("/dashboard");
  }, [user]);

  return null;
}