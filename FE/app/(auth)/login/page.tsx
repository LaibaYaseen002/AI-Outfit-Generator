"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import { signInWithEmail } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="page-center">
      <div className="w-full max-w-md space-y-6 animate-fade-in-up">
        <AuthForm
          mode="login"
          onSubmit={async ({ email, password }) => {
            await signInWithEmail(email, password);
            router.push("/dashboard");
          }}
        />
        <p className="text-center text-sm text-neutral-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
