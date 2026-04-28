export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl md:text-6xl font-bold text-brand-700">
        AI Outfit Generator
      </h1>
      <p className="mt-4 max-w-xl text-lg text-neutral-700">
        Your smart fashion assistant. Upload a photo, pick an occasion, and let
        AI craft the perfect look for you.
      </p>
      <div className="mt-8 flex gap-4">
        <a
          href="/signup"
          className="rounded-full bg-brand-700 px-6 py-3 text-white shadow hover:bg-brand-500 transition"
        >
          Get Started
        </a>
        <a
          href="/login"
          className="rounded-full border border-brand-700 px-6 py-3 text-brand-700 hover:bg-brand-50 transition"
        >
          Log In
        </a>
      </div>
      <p className="mt-12 text-xs text-neutral-500">
        Project setup complete — auth, upload, and AI features coming next.
      </p>
    </main>
  );
}
