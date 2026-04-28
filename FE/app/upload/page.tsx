"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import UploadDropzone from "@/components/UploadDropzone";
import { uploadImage, UploadResult } from "@/lib/upload";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    try {
      const res = await uploadImage(file, setProgress);
      setResult(res);
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
              <p className="mt-1 text-sm text-neutral-600">
                Your photo is stored. Path: <code>{result.path}</code>
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.url}
                alt="uploaded"
                className="mt-4 max-h-80 w-full rounded-xl object-contain"
              />
              <a
                href={result.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-sm text-brand-700 hover:underline"
              >
                Open hosted URL ↗
              </a>
              <div className="mt-5">
                <button
                  onClick={reset}
                  className="rounded-full border border-brand-700 px-5 py-2 text-brand-700 hover:bg-brand-50 transition"
                >
                  Upload another
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
