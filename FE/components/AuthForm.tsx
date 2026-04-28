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
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-4 rounded-2xl bg-white p-8 shadow-lg"
    >
      <h2 className="text-2xl font-bold text-brand-700">
        {mode === "login" ? "Welcome back" : "Create your account"}
      </h2>

      {mode === "signup" && (
        <div>
          <label className="block text-sm font-medium text-neutral-700">
            Full name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
            placeholder="Jane Doe"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-neutral-700">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Password
        </label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-brand-700 py-3 font-medium text-white shadow hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60 transition"
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
