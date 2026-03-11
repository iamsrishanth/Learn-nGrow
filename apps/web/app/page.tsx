import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-background to-indigo-50">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-chart-2/5 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-chart-3/5 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-6 text-center animate-slide-up">
        {/* Logo */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary shadow-xl shadow-primary/25 animate-pulse-glow">
          <svg
            className="h-10 w-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>

        <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-foreground">
          Learn<span className="text-primary">-n</span>Grow
        </h1>

        <p className="mb-8 text-lg text-muted-foreground leading-relaxed">
          Adaptive Pre-Algebra learning with{' '}
          <span className="font-semibold text-foreground">AI-powered diagnostics</span>,
          personalized learning paths, and real-time mastery tracking.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/login"
            className="rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl border border-border bg-card px-8 py-3.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-muted hover:shadow-md active:scale-[0.98]"
          >
            Create account
          </Link>
        </div>

        {/* Feature pills */}
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {[
            '🧠 Gemini AI Recommendations',
            '📊 Mastery Tracking',
            '🎯 Diagnostic Testing',
            '👨‍👩‍👧 Parent Visibility',
          ].map((feature) => (
            <span
              key={feature}
              className="rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
