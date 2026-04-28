"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import UploadDropzone from "@/components/UploadDropzone";
import SkinToneCard from "@/components/SkinToneCard";
import { uploadImage, UploadResult } from "@/lib/upload";
import { detectSkinTone, SkinToneResult } from "@/lib/skinTone";
import { setFlowState, clearFlowState } from "@/lib/flow";

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
  const [skinToneError, setSkinToneError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleUpload() {
    if (!file) return;
    setError(null);
    setUploading(true);
    setProgress(0);
    setResult(null);
    setSkinTone(null);
    setSkinToneError(null);

    try {
      const uploaded = await uploadImage(file, setProgress);
      setResult(uploaded);
      setFlowState({ upload: uploaded });

      // Auto-run skin tone detection on the uploaded path
      setAnalyzing(true);
      try {
        const tone = await detectSkinTone(uploaded.path);
        setSkinTone(tone);
        setFlowState({ skinTone: tone });
      } catch (err) {
        setSkinToneError(
          err instanceof Error ? err.message : "Skin tone detection failed"
        );
      } finally {
        setAnalyzing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
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
    setSkinToneError(null);
    clearFlowState();
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-brand-50 px-4 py-12">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-brand-700">Upload your photo</h1>
            <Link
              href="/dashboard"
              className="text-sm text-brand-700 hover:underline"
            >
              ← Dashboard
            </Link>
          </div>

          <p className="text-neutral-600">
            Pick a clear, front-facing photo. We&apos;ll detect your skin tone
            and use it (along with your chosen occasion) to generate outfit
            ideas in the next step.
          </p>

          <UploadDropzone
            onFileSelected={setFile}
            disabled={uploading}
            previewUrl={previewUrl}
          />

          {file && !result && (
            <div className="rounded-2xl bg-white p-4 shadow">
              <p className="text-sm text-neutral-700">
                <span className="font-medium">{file.name}</span>{" "}
                <span className="text-neutral-500">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </p>

              {uploading && (
                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-full bg-brand-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">{progress}%</p>
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="rounded-full bg-brand-700 px-5 py-2 text-white shadow hover:bg-brand-500 disabled:opacity-60 transition"
                >
                  {uploading ? "Uploading…" : "Upload"}
                </button>
                <button
                  onClick={reset}
                  disabled={uploading}
                  className="rounded-full border border-neutral-300 px-5 py-2 text-neutral-700 hover:bg-neutral-50 disabled:opacity-60 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>
          )}

          {result && (
            <div className="rounded-2xl bg-white p-6 shadow-lg">
              <h2 className="text-xl font-bold text-green-700">
                ✓ Upload successful
              </h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.url}
                alt="uploaded"
                className="mt-4 max-h-80 w-full rounded-xl object-contain"
              />
            </div>
          )}

          {analyzing && (
            <div className="rounded-2xl bg-white p-6 shadow">
              <p className="text-neutral-600">Analyzing skin tone…</p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                <div className="h-full w-1/3 animate-pulse bg-brand-500" />
              </div>
            </div>
          )}

          {skinToneError && (
            <div className="rounded-2xl bg-red-50 p-4 text-red-700">
              {skinToneError}
            </div>
          )}

          {skinTone && (
            <>
              <SkinToneCard result={skinTone} />
              <div className="flex justify-between">
                <button
                  onClick={reset}
                  className="rounded-full border border-brand-700 px-5 py-2 text-brand-700 hover:bg-brand-50 transition"
                >
                  Upload another
                </button>
                <button
                  onClick={() => router.push("/occasion")}
                  className="rounded-full bg-brand-700 px-5 py-2 text-white shadow hover:bg-brand-500 transition"
                >
                  Continue → Pick occasion
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
