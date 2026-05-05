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
        className={`group flex h-72 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed transition-all duration-200 ${
          dragOver
            ? "border-brand-500 bg-brand-50 scale-[1.01]"
            : "border-brand-200 bg-white/80 hover:border-brand-500 hover:bg-brand-50/60"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        {previewUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={previewUrl}
            alt="preview"
            className="h-full w-full rounded-3xl object-contain p-2"
          />
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-2xl text-brand-700 shadow-inner-soft transition-transform group-hover:scale-110">
              ⬆
            </div>
            <p className="mt-4 text-base font-semibold text-brand-800">
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
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      )}
    </div>
  );
}
