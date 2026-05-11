"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import UploadDropzone from "@/components/UploadDropzone";
import SkinToneCard from "@/components/SkinToneCard";
import AppearanceCard from "@/components/AppearanceCard";
import { uploadImage, UploadResult } from "@/lib/upload";
import { detectSkinTone, SkinTone, SkinToneResult } from "@/lib/skinTone";
import {
  analyzeAppearance,
  AppearanceResult,
  AgeGroup,
  Gender
} from "@/lib/appearance";
import { setFlowState, clearFlowState, FlowAppearance } from "@/lib/flow";
import { ApiError } from "@/lib/api";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [skinTone, setSkinTone] = useState<SkinToneResult | null>(null);
  const [skinToneOverridden, setSkinToneOverridden] = useState(false);
  const [skinToneError, setSkinToneError] = useState<string | null>(null);

  const [appearance, setAppearance] = useState<AppearanceResult | null>(null);
  const [appearanceOverridden, setAppearanceOverridden] = useState(false);
  const [appearanceError, setAppearanceError] = useState<string | null>(null);
  const [noFace, setNoFace] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function persistAppearance(next: FlowAppearance) {
    setFlowState({ appearance: next });
  }

  async function handleUpload() {
    if (!file) return;
    setError(null);
    setUploading(true);
    setProgress(0);
    setResult(null);
    setSkinTone(null);
    setSkinToneOverridden(false);
    setSkinToneError(null);
    setAppearance(null);
    setAppearanceOverridden(false);
    setAppearanceError(null);
    setNoFace(false);

    try {
      const uploaded = await uploadImage(file, setProgress);
      setResult(uploaded);
      setFlowState({ upload: uploaded });

      setAnalyzing(true);

      // Run skin-tone and appearance detection in parallel — they share the
      // same uploaded image and have no inter-dependency.
      const [toneOutcome, appearanceOutcome] = await Promise.allSettled([
        detectSkinTone(uploaded.path),
        analyzeAppearance(uploaded.path)
      ]);

      if (toneOutcome.status === "fulfilled") {
        setSkinTone(toneOutcome.value);
        setFlowState({ skinTone: toneOutcome.value });
      } else {
        setSkinToneError(
          toneOutcome.reason instanceof Error
            ? toneOutcome.reason.message
            : "Skin tone detection failed"
        );
      }

      if (appearanceOutcome.status === "fulfilled") {
        const a = appearanceOutcome.value;
        setAppearance(a);
        persistAppearance({
          gender: a.gender,
          ageGroup: a.ageGroup,
          confidence: a.confidence,
          overridden: false
        });
      } else {
        const reason = appearanceOutcome.reason;
        if (reason instanceof ApiError && reason.code === "NO_FACE_DETECTED") {
          setNoFace(true);
        } else {
          setAppearanceError(
            reason instanceof Error
              ? reason.message
              : "Appearance detection failed"
          );
        }
      }

      setAnalyzing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setAnalyzing(false);
    } finally {
      setUploading(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setProgress(0);
    setError(null);
    setSkinTone(null);
    setSkinToneOverridden(false);
    setSkinToneError(null);
    setAppearance(null);
    setAppearanceOverridden(false);
    setAppearanceError(null);
    setNoFace(false);
    clearFlowState();
  }

  function handleSkinToneChange(next: SkinTone) {
    if (!skinTone) return;
    const updated: SkinToneResult = { ...skinTone, tone: next };
    setSkinTone(updated);
    setSkinToneOverridden(true);
    setFlowState({ skinTone: updated });
  }

  function handleAppearanceChange(next: { gender: Gender; ageGroup: AgeGroup }) {
    if (!appearance) return;
    const updated: AppearanceResult = {
      ...appearance,
      gender: next.gender,
      ageGroup: next.ageGroup,
      // After manual selection treat as fully confident.
      status: "ok",
      confidence: 1
    };
    setAppearance(updated);
    setAppearanceOverridden(true);
    persistAppearance({
      gender: updated.gender,
      ageGroup: updated.ageGroup,
      confidence: updated.confidence,
      overridden: true
    });
  }

  // Continue is only allowed when both skin-tone and appearance are settled.
  // Low confidence is fine ONLY after the user has touched the override.
  const needsConfirmation =
    !!appearance && appearance.status === "low_confidence" && !appearanceOverridden;
  const canContinue =
    !!skinTone && !!appearance && !needsConfirmation && !analyzing;

  return (
    <ProtectedRoute>
      <main className="page">
        <div className="container-narrow space-y-7 animate-fade-in-up">
          <div className="page-header">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-500">
                Step 1 of 3
              </p>
              <h1 className="page-title mt-1">Upload your photo</h1>
            </div>
            <Link href="/dashboard" className="link-back">
              ← Dashboard
            </Link>
          </div>

          <p className="text-neutral-600">
            Pick a clear, front-facing photo. We&apos;ll auto-detect your skin
            tone, gender, and age group to tailor the outfit — you can override
            anything before continuing.
          </p>

          <UploadDropzone
            onFileSelected={setFile}
            disabled={uploading}
            previewUrl={previewUrl}
          />

          {file && !result && (
            <div className="card-flat">
              <p className="text-sm text-neutral-700">
                <span className="font-semibold">{file.name}</span>{" "}
                <span className="text-neutral-500">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </p>

              {uploading && (
                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-full bg-brand-gradient transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">{progress}%</p>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                <button
                  onClick={reset}
                  disabled={uploading}
                  className="btn btn-md btn-ghost"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="btn btn-md btn-primary"
                >
                  {uploading ? "Uploading…" : "Upload"}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-red-50 px-5 py-4 text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          )}

          {result && (
            <div className="card animate-fade-in-up">
              <h2 className="flex items-center gap-2 text-xl font-bold text-emerald-700">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-sm">
                  ✓
                </span>
                Upload successful
              </h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.url}
                alt="uploaded"
                className="mt-4 max-h-80 w-full rounded-2xl object-contain"
              />
            </div>
          )}

          {analyzing && (
            <div className="card-flat">
              <p className="font-medium text-neutral-700">
                Analyzing your photo…
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Detecting skin tone, gender, and age group.
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                <div className="h-full w-1/3 animate-pulse bg-brand-gradient" />
              </div>
            </div>
          )}

          {noFace && (
            <div className="rounded-2xl bg-amber-50 px-5 py-4 text-amber-800 ring-1 ring-amber-100">
              <p className="font-semibold">No face detected</p>
              <p className="mt-1 text-sm">
                Please upload a clear front-facing image so we can detect your
                appearance.
              </p>
              <button onClick={reset} className="btn btn-sm btn-secondary mt-3">
                Try a different photo
              </button>
            </div>
          )}

          {skinToneError && (
            <div className="rounded-2xl bg-red-50 px-5 py-4 text-red-700 ring-1 ring-red-100">
              {skinToneError}
            </div>
          )}

          {appearanceError && !noFace && (
            <div className="rounded-2xl bg-red-50 px-5 py-4 text-red-700 ring-1 ring-red-100">
              {appearanceError}
            </div>
          )}

          {skinTone && (
            <SkinToneCard
              result={skinTone}
              overridden={skinToneOverridden}
              onChange={handleSkinToneChange}
            />
          )}

          {appearance && (
            <AppearanceCard
              gender={appearance.gender}
              ageGroup={appearance.ageGroup}
              confidence={appearance.confidence}
              overridden={appearanceOverridden}
              needsConfirmation={needsConfirmation}
              onChange={handleAppearanceChange}
            />
          )}

          {(skinTone || appearance) && (
            <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
              <button onClick={reset} className="btn btn-md btn-secondary">
                Upload another
              </button>
              <button
                onClick={() => router.push("/occasion")}
                disabled={!canContinue}
                className="btn btn-md btn-primary"
              >
                Continue
                <span aria-hidden>→</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
