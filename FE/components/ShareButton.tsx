"use client";

import { useState } from "react";
import {
  buildShareUrl,
  createShare,
  revokeShare
} from "@/lib/share";

interface Props {
  id: string;
  // If the parent already knows whether a token is set (e.g. from the
  // history detail fetch), pass it so the first click skips the network
  // round-trip and goes straight to copy.
  initialToken?: string | null;
  onChange?: (next: string | null) => void;
  className?: string;
}

const COPY_FEEDBACK_MS = 2000;

export default function ShareButton({
  id,
  initialToken = null,
  onChange,
  className = ""
}: Props) {
  const [token, setToken] = useState<string | null>(initialToken);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback("Link copied!");
    } catch {
      // Fallback for browsers that block clipboard without a user gesture.
      setFeedback(text);
    }
    setTimeout(() => setFeedback(null), COPY_FEEDBACK_MS);
  }

  async function handleShare() {
    if (pending) return;
    setError(null);
    if (token) {
      copyToClipboard(buildShareUrl(token));
      return;
    }
    setPending(true);
    try {
      const res = await createShare(id);
      setToken(res.token);
      onChange?.(res.token);
      copyToClipboard(buildShareUrl(res.token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create share link");
    } finally {
      setPending(false);
    }
  }

  async function handleRevoke() {
    if (pending || !token) return;
    if (!confirm("Stop sharing this outfit? The link will stop working.")) return;
    setError(null);
    setPending(true);
    try {
      await revokeShare(id);
      setToken(null);
      onChange?.(null);
      setFeedback("Sharing stopped");
      setTimeout(() => setFeedback(null), COPY_FEEDBACK_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke share");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleShare}
        disabled={pending}
        title={error ?? feedback ?? (token ? "Copy share link" : "Create share link")}
        className={`btn btn-sm ${token ? "btn-secondary" : "btn-primary"} ${
          pending ? "opacity-80" : ""
        }`}
      >
        <span aria-hidden>🔗</span>
        {feedback ?? (token ? "Copy link" : pending ? "Sharing…" : "Share")}
      </button>
      {token && (
        <button
          type="button"
          onClick={handleRevoke}
          disabled={pending}
          className="btn btn-sm btn-ghost"
          title="Stop sharing"
        >
          Unshare
        </button>
      )}
    </div>
  );
}
