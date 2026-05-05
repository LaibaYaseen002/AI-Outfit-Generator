import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-center text-center">
      <div className="container-narrow flex flex-col items-center gap-8 animate-fade-in-up">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-brand-700 shadow-sm backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          AI-Powered Styling
        </span>

        <h1 className="text-balance text-4xl font-bold leading-tight text-brand-800 md:text-6xl">
          Your smart{" "}
          <span className="bg-brand-gradient bg-clip-text text-transparent">
            fashion assistant
          </span>
        </h1>

        <p className="text-balance max-w-xl text-lg text-neutral-700">
          Upload a photo, pick an occasion, and let AI craft the perfect look —
          tuned to your skin tone, style, and the moment.
        </p>

        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <Link href="/signup" className="btn btn-lg btn-primary">
            Get Started
            <span aria-hidden>→</span>
          </Link>
          <Link href="/login" className="btn btn-lg btn-secondary">
            Log In
          </Link>
        </div>

        <p className="mt-10 text-xs uppercase tracking-[0.2em] text-neutral-500">
          Project setup complete — auth, upload, and AI features inside.
        </p>
      </div>
    </main>
  );
}
