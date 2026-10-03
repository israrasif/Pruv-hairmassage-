import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase";

/** Current Supabase user, kept in sync with sign-in / sign-out. */
export function useUser(): User | null {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUser(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return user;
}

export function displayName(user: User | null): string {
  const meta = user?.user_metadata ?? {};
  return meta.full_name || meta.name || user?.email?.split("@")[0] || "Guest";
}