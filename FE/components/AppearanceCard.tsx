"use client";

import { useState } from "react";
import type { AgeGroup, Gender } from "@/lib/appearance";

interface Props {
  gender: Gender;
  ageGroup: AgeGroup;
  confidence: number;
  // Was this value already adjusted by the user?
  overridden: boolean;
  // True when the detector flagged the auto-call as low confidence — in that
  // case we expand the override UI by default and require explicit confirmation.
  needsConfirmation: boolean;
  onChange: (next: { gender: Gender; ageGroup: AgeGroup }) => void;
}

const GENDERS: { value: Gender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" }
];

const AGE_GROUPS: { value: AgeGroup; label: string }[] = [
  { value: "child", label: "Child" },
  { value: "teenager", label: "Teen" },
  { value: "adult", label: "Adult" }
];

const AGE_LABELS: Record<AgeGroup, string> = {
  child: "Child",
  teenager: "Teen",
  adult: "Adult"
};

const GENDER_LABELS: Record<Gender, string> = {
  male: "Male",
  female: "Female"
};

export default function AppearanceCard({
  gender,
  ageGroup,
  confidence,
  overridden,
  needsConfirmation,
  onChange
}: Props) {
  const [editing, setEditing] = useState(needsConfirmation);
  const summary = `${AGE_LABELS[ageGroup]} ${GENDER_LABELS[gender]}`;

  return (
    <div
      className={`card-flat animate-fade-in-up ${
        needsConfirmation ? "ring-2 ring-amber-200" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-lg">
            {ageGroup === "child" ? "🧒" : gender === "female" ? "👩" : "👨"}
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
              {overridden
                ? "Manually selected"
                : needsConfirmation
                  ? "Please confirm"
                  : "Detected"}
            </p>
            <p className="font-semibold text-neutral-800">{summary}</p>
            {!overridden && (
              <p className="text-xs text-neutral-500">
                Confidence {Math.round(confidence * 100)}%
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="btn btn-sm btn-ghost"
        >
          {editing ? "Done" : "Override"}
        </button>
      </div>

      {needsConfirmation && !overridden && (
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-800 ring-1 ring-amber-100">
          We&apos;re not fully sure — please confirm or pick the correct option
          below.
        </p>
      )}

      {editing && (
        <div className="mt-5 space-y-4 border-t border-neutral-100 pt-4">
          <div>
            <p className="label">Gender</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {GENDERS.map((g) => {
                const selected = gender === g.value;
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => onChange({ gender: g.value, ageGroup })}
                    className={`btn btn-sm ${
                      selected ? "btn-primary" : "btn-secondary"
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="label">Age group</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {AGE_GROUPS.map((a) => {
                const selected = ageGroup === a.value;
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => onChange({ gender, ageGroup: a.value })}
                    className={`btn btn-sm ${
                      selected ? "btn-primary" : "btn-secondary"
                    }`}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
