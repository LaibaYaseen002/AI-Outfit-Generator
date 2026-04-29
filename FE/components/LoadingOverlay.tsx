"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Reading your skin tone…",
  "Picking flattering colors…",
  "Choosing fabrics for the occasion…",
  "Pairing accessories…",
  "Putting it all together…"
];

export default function LoadingOverlay({ open }: { open: boolean }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!open) {
      setIdx(0);
      return;
    }
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % MESSAGES.length);
    }, 1600);
    return () => window.clearInterval(id);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm animate-fade-in"
    >
      <div className="mx-4 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl animate-scale-in">
        <div className="relative mx-auto h-16 w-16">
          <span className="absolute inset-0 rounded-full bg-brand-100 animate-float" />
          <span className="absolute inset-2 rounded-full bg-brand-500/30" />
          <span className="absolute inset-4 rounded-full bg-brand-700 shadow-lg" />
        </div>

        <h2 className="mt-6 text-lg font-semibold text-brand-700">
          Crafting your outfit
        </h2>
        <p
          key={idx}
          className="mt-2 min-h-[1.5rem] text-sm text-neutral-600 animate-fade-in"
        >
          {MESSAGES[idx]}
        </p>

        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
          <div className="relative h-full w-1/3 rounded-full bg-brand-500">
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}
