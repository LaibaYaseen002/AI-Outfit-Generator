"use client";

import { useEffect, useState } from "react";
import { getSignedUrl } from "@/lib/history";

interface Props {
  // Prefer the outfit-preview image; fall back to the user's photo.
  outfitImagePath?: string | null;
  userImagePath?: string | null;
  // Older single-arg call sites still pass `path` — treated as user photo.
  path?: string | null;
  alt?: string;
}

export default function HistoryThumb({
  outfitImagePath,
  userImagePath,
  path,
  alt = "Outfit"
}: Props) {
  const effectivePath = outfitImagePath ?? userImagePath ?? path ?? null;
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    if (!effectivePath) return;
    getSignedUrl(effectivePath)
      .then((res) => {
        if (!cancelled) setUrl(res.url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [effectivePath]);

  if (!effectivePath || failed) {
    return (
      <div className="flex aspect-square w-full items-center justify-center bg-brand-gradient-soft text-brand-700">
        <span className="text-3xl">👗</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="aspect-square w-full animate-pulse bg-gradient-to-br from-brand-50 to-brand-100" />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className="aspect-square w-full object-cover"
    />
  );
}
