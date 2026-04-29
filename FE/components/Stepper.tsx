"use client";

type StepKey = "upload" | "occasion" | "result";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "occasion", label: "Occasion" },
  { key: "result", label: "Outfit" }
];

export default function Stepper({ current }: { current: StepKey }) {
  const activeIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <ol
      className="flex items-center justify-center gap-2 sm:gap-4 animate-fade-in-down"
      aria-label="Progress"
    >
      {STEPS.map((step, i) => {
        const isActive = i === activeIndex;
        const isComplete = i < activeIndex;
        return (
          <li key={step.key} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <span
                aria-current={isActive ? "step" : undefined}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${
                  isComplete
                    ? "bg-brand-700 text-white shadow"
                    : isActive
                      ? "bg-brand-700 text-white shadow ring-4 ring-brand-100"
                      : "bg-white text-neutral-400 ring-1 ring-neutral-200"
                }`}
              >
                {isComplete ? "✓" : i + 1}
              </span>
              <span
                className={`hidden text-sm font-medium sm:inline ${
                  isActive
                    ? "text-brand-700"
                    : isComplete
                      ? "text-neutral-700"
                      : "text-neutral-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={`h-px w-8 transition-colors duration-300 sm:w-12 ${
                  isComplete ? "bg-brand-700" : "bg-neutral-300"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
