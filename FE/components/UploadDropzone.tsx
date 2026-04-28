"use client";

import { useRef, useState, ChangeEvent, DragEvent } from "react";

interface UploadDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  previewUrl?: string | null;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export default function UploadDropzone({
  onFileSelected,
  disabled,
  previewUrl
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validateAndPick(file: File) {
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Unsupported file type. Use JPEG, PNG, or WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File too large. Max 5 MB.");
      return;
    }
    onFileSelected(file);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndPick(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndPick(file);
  }

  return (
    <div className="w-full">
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition ${
          dragOver
            ? "border-brand-500 bg-brand-50"
            : "border-neutral-300 bg-white hover:border-brand-500"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        {previewUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={previewUrl}
            alt="preview"
            className="h-full w-full rounded-2xl object-contain p-2"
          />
        ) : (
          <>
            <p className="text-lg font-medium text-neutral-700">
              Drop your photo here
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              or click to browse — JPEG, PNG, WEBP up to 5 MB
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
        />
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
