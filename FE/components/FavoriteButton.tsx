"use client";

import { useState } from "react";
import { setFavorite } from "@/lib/history";

interface Props {
  id: string;
  initial: boolean;
  // Notified after the toggle completes (or rolls back on error). Lets the
  // parent keep its own list/cache in sync.
  onChange?: (next: boolean) => void;
  // Visual variants — "icon" for compact (history card overlay), "chip" for
  // labeled placements (result page, detail header).
  variant?: "icon" | "chip";
  className?: string;
}

const HEART_FILLED = "♥";
const HEART_OUTLINE = "♡";

export default function FavoriteButton({
  id,
  initial,
  onChange,
  variant = "chip",
  className = ""
}: Props) {
  const [favorite, setFavoriteState] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;

    const next = !favorite;
    // Optimistic update — flip immediately so the UI feels instant.
    setFavoriteState(next);
    setPending(true);
    setError(null);
    try {
      const res = await setFavorite(id, next);
      setFavoriteState(res.is_favorite);
      onChange?.(res.is_favorite);
    } catch (err) {
      // Roll back on failure.
      setFavoriteState(!next);
      setError(err instanceof Error ? err.message : "Failed to update favorite");
      onChange?.(!next);
    } finally {
      setPending(false);
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={favorite}
        aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
        title={error ?? (favorite ? "Favorited" : "Add to favorites")}
        className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg shadow-soft ring-1 ring-black/5 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-brand ${
          favorite ? "text-rose-500" : "text-neutral-400 hover:text-rose-500"
        } ${pending ? "opacity-70" : ""} ${className}`}
      >
        <span aria-hidden>{favorite ? HEART_FILLED : HEART_OUTLINE}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={favorite}
      title={error ?? undefined}
      className={`btn btn-sm ${
        favorite ? "btn-primary" : "btn-secondary"
      } ${pending ? "opacity-80" : ""} ${className}`}
    >
      <span aria-hidden className={favorite ? "text-rose-100" : "text-rose-500"}>
        {favorite ? HEART_FILLED : HEART_OUTLINE}
      </span>
      {favorite ? "Favorited" : "Favorite"}
    </button>
  );
}
