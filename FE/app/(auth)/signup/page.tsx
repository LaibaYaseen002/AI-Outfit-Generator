"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import { signUpWithEmail } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();

  return (
    <main className="page-center">
      <div className="w-full max-w-md space-y-6 animate-fade-in-up">
        <AuthForm
          mode="signup"
          onSubmit={async ({ email, password, fullName }) => {
            const data = await signUpWithEmail(email, password, fullName);
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
          <Link
            href="/login"
            className="font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
