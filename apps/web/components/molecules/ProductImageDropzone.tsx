"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
} from "react";
import { CircularUploadProgress } from "@/components/atoms/CircularUploadProgress";
import { cn } from "@/lib/utils/cn";
import { resolveProductImageUrl } from "@/lib/utils/legacyMediaUrl";

type ProductImageDropzoneProps = {
  previewUrl?: string | null;
  fileName?: string;
  /** True while compress + network upload run. */
  uploading?: boolean;
  /** 0–100, or null while preparing (compress). */
  progress?: number | null;
  disabled?: boolean;
  accept?: string;
  helpText?: string;
  /** HQ6 compact (filename + Browse) vs modern drop tile. */
  variant?: "hq6" | "tile";
  className?: string;
  onFileSelect: (file: File | null) => void;
};

/**
 * Product image picker: drop / browse, with Apple-install style circular
 * progress overlaid on the preview while uploading.
 */
export function ProductImageDropzone({
  previewUrl,
  fileName = "",
  uploading = false,
  progress = null,
  disabled = false,
  accept = "image/jpeg,image/png,image/webp,image/avif,image/gif",
  helpText = "Max 12MB · Aspect ratio 1:1 · JPEG, PNG, WebP, AVIF, or GIF",
  variant = "hq6",
  className,
  onFileSelect,
}: ProductImageDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const resolved = resolveProductImageUrl(previewUrl);
  const busy = uploading || disabled;

  const takeFile = useCallback(
    (file: File | null | undefined) => {
      if (file == null) {
        onFileSelect(null);
        return;
      }
      if (busy) return;
      if (!file.type.startsWith("image/")) return;
      onFileSelect(file);
    },
    [busy, onFileSelect],
  );

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    takeFile(e.target.files?.[0] ?? null);
    e.target.value = "";
  };

  const showRemove = Boolean(resolved || fileName) && !disabled;
  const removeImage = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    takeFile(null);
  };

  const preview = (
    <div
      className={cn(
        "relative overflow-hidden bg-[#f3f4f6]",
        variant === "hq6"
          ? "mt-2 h-[88px] w-[88px] rounded-[18px] border border-[#ddd]"
          : "mx-auto h-[120px] w-[120px] rounded-[26px] border border-border shadow-sm",
      )}
    >
      {resolved ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-center">
          <span className="text-[22px] leading-none text-[#9ca3af]" aria-hidden>
            ⊕
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-[#9ca3af]">
            Image
          </span>
        </div>
      )}

      {showRemove ? (
        <button
          type="button"
          className={cn(
            "absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/70 bg-black/55 text-sm font-semibold leading-none text-white shadow-sm transition-colors hover:bg-black/75",
            variant === "hq6" ? "h-5 w-5 text-xs" : "",
          )}
          aria-label={uploading ? "Cancel image upload" : "Remove product image"}
          onClick={removeImage}
        >
          <span aria-hidden>×</span>
        </button>
      ) : null}

      {/* Drop hover overlay */}
      {dragOver && !uploading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
          <span className="px-2 text-center text-[11px] font-semibold text-white">
            Drop to upload
          </span>
        </div>
      ) : null}

      {/* Apple-install style upload overlay */}
      {uploading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/48 backdrop-blur-[1.5px]">
          <CircularUploadProgress
            progress={progress}
            size={variant === "hq6" ? 52 : 64}
            strokeWidth={3.25}
          />
        </div>
      ) : null}
    </div>
  );

  const dropHandlers = {
    onDragEnter: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!busy) setDragOver(true);
    },
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!busy) setDragOver(true);
    },
    onDragLeave: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      takeFile(e.dataTransfer.files?.[0]);
    },
  };

  if (variant === "tile") {
    return (
      <div className={cn("space-y-2", className)}>
        <button
          type="button"
          disabled={busy}
          className={cn(
            "flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm transition-colors",
            dragOver && "border-foreground/40 bg-[var(--color-surface-muted)]",
            busy && "cursor-not-allowed opacity-70",
          )}
          onClick={() => inputRef.current?.click()}
          {...dropHandlers}
        >
          <p className="font-medium text-foreground">Product image</p>
          {preview}
          <p className="text-xs text-muted">
            {uploading
              ? progress == null
                ? "Preparing…"
                : `Uploading ${Math.round(progress)}%`
              : "Drop an image here or click to browse"}
          </p>
          {fileName ? (
            <p className="max-w-full truncate text-xs text-muted">{fileName}</p>
          ) : null}
        </button>
        <p className="text-xs text-muted">{helpText}</p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          disabled={busy}
          onChange={onInputChange}
        />
      </div>
    );
  }

  return (
    <div className={cn("form-group", className)} {...dropHandlers}>
      <label htmlFor={inputId}>Product image:</label>
      <div className="input-group">
        <input
          type="text"
          className="form-control"
          readOnly
          value={fileName || ""}
          placeholder={
            uploading
              ? progress == null
                ? "Preparing…"
                : `Uploading ${Math.round(progress)}%`
              : ""
          }
        />
        <span className="input-group-btn">
          <label
            className={cn(
              "btn btn-primary btn-flat hq6-browse-btn",
              busy ? "disabled" : "",
            )}
          >
            Browse…
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={accept}
              className="sr-only"
              disabled={busy}
              onChange={onInputChange}
            />
          </label>
        </span>
      </div>
      {preview}
      <small>
        <p className="help-block">
          {helpText.split(" · ").map((line, i, arr) => (
            <span key={line}>
              {line}
              {i < arr.length - 1 ? (
                <>
                  <br />
                </>
              ) : null}
            </span>
          ))}
        </p>
      </small>
    </div>
  );
}
