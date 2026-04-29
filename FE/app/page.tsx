export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gradient-warm px-6 text-center overflow-hidden">
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-100 blur-3xl opacity-70 animate-float"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl opacity-70 animate-float"
        style={{ animationDelay: "1.2s" }}
      />

      <div className="relative z-10 flex flex-col items-center animate-fade-in-up">
        <span className="rounded-full bg-white/80 px-4 py-1 text-xs font-medium uppercase tracking-wider text-brand-700 shadow-sm backdrop-blur">
          Smart Fashion Assistant
        </span>

        <h1 className="mt-5 text-4xl font-bold text-brand-700 md:text-6xl">
          AI Outfit Generator
        </h1>
        <p className="mt-4 max-w-xl text-lg text-neutral-700">
          Upload a photo, pick an occasion, and let AI craft a look tailored to
          your skin tone — colors, accessories, and the reasoning behind every
          choice.
        </p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <a
            href="/signup"
            className="rounded-full bg-brand-700 px-7 py-3 text-white shadow transition-all duration-200 hover:bg-brand-500 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          >
            Get Started
          </a>
          <a
            href="/login"
            className="rounded-full border border-brand-700 bg-white/70 px-7 py-3 text-brand-700 backdrop-blur transition hover:bg-brand-50"
          >
            Log In
          </a>
        </div>
      </div>

      <ul className="stagger relative z-10 mt-16 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        <Feature
          icon="📸"
          title="Upload"
          body="Add a clear, front-facing photo. We auto-detect your skin tone."
        />
        <Feature
          icon="🎯"
          title="Pick occasion"
          body="Wedding, office, gym, mehndi — set the vibe and any preferences."
        />
        <Feature
          icon="✨"
          title="Get styled"
          body="A complete outfit with colors, accessories, and styling notes."
        />
      </ul>
    </main>
  );
}

function Feature({
  icon,
  title,
  body
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <li className="animate-fade-in-up rounded-2xl bg-white/80 p-5 text-left shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="text-2xl">{icon}</div>
      <p className="mt-2 font-semibold text-brand-700">{title}</p>
      <p className="mt-1 text-sm text-neutral-600">{body}</p>
    </li>
  );
}
