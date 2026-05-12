"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Design, listDesigns } from "@/lib/design";

export default function DesignDashboardPage() {
  const [designs, setDesigns] = useState<Design[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDesigns()
      .then((res) => setDesigns(res.items))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load designs")
      );
  }, []);

  return (
    <ProtectedRoute>
      <main className="page">
        <div className="container-narrow space-y-6 animate-fade-in-up">
          <div className="page-header">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-500">
                AI Fashion Designer
              </p>
              <h1 className="page-title mt-1">Design Studio</h1>
            </div>
            <div className="flex gap-2">
              <Link href="/dashboard" className="link-back">
                ← Dashboard
              </Link>
              <Link href="/design/new" className="btn btn-md btn-primary">
                New design
                <span aria-hidden>+</span>
              </Link>
            </div>
          </div>

          <p className="text-neutral-600">
            Upload neckline, sleeve, daman, and other reference images, write
            what you want, and the AI will merge them into one realistic
            mannequin outfit.
          </p>

          {error && (
            <div className="rounded-2xl bg-red-50 px-5 py-4 text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          )}

          {designs === null && !error && (
            <div className="flex items-center gap-3 text-neutral-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
              Loading…
            </div>
          )}

          {designs?.length === 0 && (
            <div className="card text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-2xl">
                ✨
              </div>
              <h2 className="mt-3 text-lg font-semibold text-brand-800">
                No designs yet
              </h2>
              <p className="mt-2 text-neutral-600">
                Start by creating your first AI-merged outfit design.
              </p>
              <Link
                href="/design/new"
                className="btn btn-md btn-primary mt-4 inline-flex"
              >
                Create design
              </Link>
            </div>
          )}

          {designs && designs.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {designs.map((d) => (
                <Link
                  key={d.id}
                  href={`/design/${d.id}`}
                  className="group overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-brand"
                >
                  <div className="relative aspect-square bg-neutral-100">
                    {d.outputUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={d.outputUrl}
                        alt="design"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-neutral-400">
                        <span className="text-2xl">⏳</span>
                        <span className="text-xs capitalize">{d.status}</span>
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-2">
                    <p className="line-clamp-2 text-sm text-neutral-700">
                      {d.userPrompt}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-neutral-500">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
