"use client";

import { useState, FormEvent } from "react";

interface AuthFormProps {
  mode: "login" | "signup";
  onSubmit: (values: {
    email: string;
    password: string;
    fullName?: string;
  }) => Promise<void>;
}

export default function AuthForm({ mode, onSubmit }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit({ email, password, fullName: fullName || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      <div className="space-y-1.5 text-center">
        <h2 className="text-2xl font-bold text-brand-800">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h2>
        <p className="text-sm text-neutral-500">
          {mode === "login"
            ? "Sign in to continue styling your looks."
            : "A few details and you’re styled in seconds."}
        </p>
      </div>

      {mode === "signup" && (
        <div>
          <label className="label">Full name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input"
            placeholder="Jane Doe"
          />
        </div>
      )}

      <div>
        <label className="label">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="label">Password</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn btn-lg btn-primary btn-block"
      >
        {loading
          ? "Please wait…"
          : mode === "login"
            ? "Log In"
            : "Sign Up"}
      </button>
    </form>
  );
}
