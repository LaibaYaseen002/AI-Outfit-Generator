"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
      <main className="page-center">
        <div className="card w-full max-w-xl text-center animate-fade-in-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-brand-800">
            Dashboard
          </span>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-brand-800 sm:text-4xl">
            Welcome{email ? "," : ""}
            {email && (
              <span className="block truncate text-2xl font-semibold text-brand-600 sm:text-3xl">
                {email}
              </span>
            )}
          </h1>

          <p className="mx-auto mt-3 max-w-md text-neutral-600">
            You&apos;re logged in. Start by uploading a photo to generate your
            first outfit recommendation.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link
              href="/upload"
              className="btn btn-lg btn-primary sm:col-span-2"
            >
              Try the Outfit Generator
              <span aria-hidden>→</span>
            </Link>
            <Link href="/history" className="btn btn-md btn-secondary">
              View History
            </Link>
            <Link href="/wardrobe" className="btn btn-md btn-secondary">
              My Wardrobe
            </Link>
            <button
              onClick={handleLogout}
              className="btn btn-md btn-ghost sm:col-span-2"
            >
              Log out
            </button>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
