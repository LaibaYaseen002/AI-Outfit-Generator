"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import { signUpWithEmail } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center gradient-warm px-4">
      <div className="w-full max-w-md space-y-4 animate-fade-in-up">
        <AuthForm
          mode="signup"
          onSubmit={async ({ email, password, fullName }) => {
            const data = await signUpWithEmail(email, password, fullName);
            // If email confirmation is disabled, session is returned and user is logged in
            if (data.session) {
              router.push("/dashboard");
            } else {
              alert(
                "Signup successful. Please check your email to confirm your account."
              );
              router.push("/login");
            }
          }}
        />
        <p className="text-center text-sm text-neutral-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-700 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
