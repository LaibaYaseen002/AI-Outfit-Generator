"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import DesignReferenceUploader from "@/components/DesignReferenceUploader";
import DesignReferenceCard from "@/components/DesignReferenceCard";
import {
  DesignControls,
  DesignReference,
  generateDesign,
  listDesignReferences
} from "@/lib/design";

export default function NewDesignPage() {
  const router = useRouter();
  const [references, setReferences] = useState<DesignReference[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [userPrompt, setUserPrompt] = useState("");
  const [controls, setControls] = useState<DesignControls>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDesignReferences()
      .then((res) => {
        setReferences(res.items);
        // Auto-select recent ones (up to 4) so first-time users don't hit
        // the "0 references" block.
        const initial = new Set(res.items.slice(0, 4).map((r) => r.id));
        setSelectedIds(initial);
      })
      .catch(() => {})
      .finally(() => setLoadingRefs(false));
  }, []);

  function handleUploaded(ref: DesignReference) {
    setReferences((prev) => [ref, ...prev]);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(ref.id);
      return next;
    });
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDelete(id: string) {
    setReferences((prev) => prev.filter((r) => r.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function updateControl<K extends keyof DesignControls>(
    key: K,
    value: string
  ) {
    setControls((prev) => ({
      ...prev,
      [key]: value.trim() ? value : undefined
    }));
  }

  async function handleGenerate() {
    if (selectedIds.size === 0) {
      setError("Select at least one reference image first.");
      return;
    }
    if (!userPrompt.trim()) {
      setError("Add a short description of what you want to design.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const design = await generateDesign({
        referenceIds: Array.from(selectedIds),
        userPrompt: userPrompt.trim(),
        controls
      });
      router.push(`/design/${design.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start generation");
      setSubmitting(false);
    }
  }

  const selectedCount = selectedIds.size;

  return (
    <ProtectedRoute>
      <main className="page">
        <div className="container-narrow space-y-8 animate-fade-in-up">
          <div className="page-header">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-500">
                AI Fashion Designer
              </p>
              <h1 className="page-title mt-1">Create a new design</h1>
            </div>
            <Link href="/design" className="link-back">
              ← My designs
            </Link>
          </div>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-800">
              1. Add design references
            </h2>
            <DesignReferenceUploader onUploaded={handleUploaded} />
          </section>

          {loadingRefs ? (
            <div className="text-sm text-neutral-500">Loading references…</div>
          ) : references.length > 0 ? (
            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold text-neutral-800">
                  2. Pick references to merge
                </h2>
                <p className="text-sm text-neutral-500">
                  {selectedCount} selected
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {references.map((r) => (
                  <DesignReferenceCard
                    key={r.id}
                    reference={r}
                    selected={selectedIds.has(r.id)}
                    onToggleSelect={handleToggleSelect}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="card space-y-5">
            <h2 className="text-lg font-semibold text-neutral-800">
              3. Describe what you want
            </h2>
            <div>
              <label className="label">Description</label>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                rows={3}
                placeholder="e.g. Elegant black chiffon maxi with silver embroidery, full sleeves, floor length, premium bridal vibe."
                className="input"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ControlInput
                label="Primary color"
                placeholder="navy, gold, blush…"
                value={controls.color ?? ""}
                onChange={(v) => updateControl("color", v)}
              />
              <ControlInput
                label="Fabric"
                placeholder="chiffon, silk, organza…"
                value={controls.fabric ?? ""}
                onChange={(v) => updateControl("fabric", v)}
              />
              <ControlInput
                label="Sleeve length"
                placeholder="full, three-quarter, cap…"
                value={controls.sleeveLength ?? ""}
                onChange={(v) => updateControl("sleeveLength", v)}
              />
              <ControlInput
                label="Shirt length"
                placeholder="short, knee, floor…"
                value={controls.shirtLength ?? ""}
                onChange={(v) => updateControl("shirtLength", v)}
              />
              <ControlInput
                label="Trouser style"
                placeholder="straight, cigarette, sharara…"
                value={controls.trouserStyle ?? ""}
                onChange={(v) => updateControl("trouserStyle", v)}
              />
              <ControlInput
                label="Dupatta style"
                placeholder="net, organza, embellished…"
                value={controls.dupattaStyle ?? ""}
                onChange={(v) => updateControl("dupattaStyle", v)}
              />
              <ControlInput
                label="Fit"
                placeholder="fitted, A-line, flowy…"
                value={controls.fit ?? ""}
                onChange={(v) => updateControl("fit", v)}
              />
              <ControlInput
                label="Embroidery density"
                placeholder="light, medium, heavy"
                value={controls.embroideryDensity ?? ""}
                onChange={(v) => updateControl("embroideryDensity", v)}
              />
            </div>
          </section>

          {error && (
            <div className="rounded-2xl bg-red-50 px-5 py-4 text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={submitting}
            className="btn btn-lg btn-primary btn-block"
          >
            {submitting ? "Sending to AI…" : "Generate outfit ✨"}
          </button>
        </div>
      </main>
    </ProtectedRoute>
  );
}

function ControlInput({
  label,
  placeholder,
  value,
  onChange
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input"
      />
    </div>
  );
}
