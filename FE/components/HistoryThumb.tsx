"use client";

import { useEffect, useState } from "react";
import { getSignedUrl } from "@/lib/history";

export default function HistoryThumb({ path }: { path: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!path) return;
    getSignedUrl(path)
      .then((res) => {
        if (!cancelled) setUrl(res.url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!path || failed) {
    return (
      <div className="flex aspect-square w-full items-center justify-center bg-brand-100 text-brand-700">
        <span className="text-3xl">👗</span>
      </div>
    );
  }

  if (!url) {
    return <div className="aspect-square w-full animate-pulse bg-neutral-200" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="Outfit photo"
      className="aspect-square w-full object-cover"
    />
  );
}
