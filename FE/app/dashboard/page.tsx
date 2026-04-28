"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  async function handleLogout() {
    await signOut();
    router.replace("/login");
  }

  return (
    <ProtectedRoute>
      <main className="flex min-h-screen flex-col items-center justify-center bg-brand-50 px-6 text-center">
        <div className="w-full max-w-lg rounded-2xl bg-white p-10 shadow-lg">
          <h1 className="text-3xl font-bold text-brand-700">
            Welcome{email ? `, ${email}` : ""}!
          </h1>
          <p className="mt-3 text-neutral-600">
            You&apos;re logged in. Outfit generation, history, and uploads will
            appear here in the next features.
          </p>
          <button
            onClick={handleLogout}
            className="mt-8 rounded-full border border-brand-700 px-6 py-3 text-brand-700 hover:bg-brand-50 transition"
          >
            Log out
          </button>
        </div>
      </main>
    </ProtectedRoute>
  );
}
