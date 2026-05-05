"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export default function ProtectedRoute({
  children
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        router.replace("/login");
      } else {
        setSession(data.session);
      }
      setChecking(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        if (!newSession) router.replace("/login");
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (checking) {
    return (
      <main className="page-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
          <p className="text-sm font-medium text-brand-700">Loading…</p>
        </div>
      </main>
    );
  }

  if (!session) return null;

  return <>{children}</>;
}
