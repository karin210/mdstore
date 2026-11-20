"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browserClient";

/**
 * Whether the signed-in visitor is an admin, for UI that only admins need (the "Reviews" link in
 * the header menu). It runs in the browser, after the page is shown, so the shared header stays
 * static and doesn't read the session on the server. False until the answer arrives, while signed
 * out and when the check fails. Only a convenience: /reviews answers 404 to non-admins (src/proxy.ts)
 * and the database enforces the role, whatever this returns.
 * Named `use…` because React's rules of hooks require it, even though project code is snake_case.
 */
export function useIsAdmin(): boolean {
  const [is_admin, set_is_admin] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    if (!supabase) return;
    let is_current = true;

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        set_is_admin(false);
        return;
      }
      // Deferred a tick: Supabase can deadlock on calls made from inside this callback.
      setTimeout(async () => {
        const { data: answer, error } = await supabase.rpc("is_admin");
        if (is_current) set_is_admin(!error && answer === true);
      }, 0);
    });
    return () => {
      is_current = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return is_admin;
}
