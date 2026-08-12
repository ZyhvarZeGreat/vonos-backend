/** Max bytes accepted by Nest /media/upload after client compression. */
export const PRODUCT_IMAGE_MAX_BYTES = 12 * 1024 * 1024;

const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.82;

function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/avif") return "avif";
  return "jpg";
}

/**
 * Downscale + re-encode large phone photos so uploads stay under the API
 * body limit. Small files and GIFs (animation) pass through unchanged.
 */
export async function compressProductImage(file: File): Promise<File> {
  // GIF/AVIF pass through — animation / modern codec; server accepts AVIF as-is.
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.type === "image/avif"
  ) {
    return file;
  }
  // Already small enough — skip canvas work.
  if (file.size <= 900 * 1024) {
    return file;
  }
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return file;
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const preserveFormat =
      file.type === "image/png" || file.type === "image/webp";
    const mime = preserveFormat
      ? file.type === "image/png"
        ? "image/png"
        : "image/webp"
      : "image/jpeg";

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        resolve,
        mime,
        mime === "image/jpeg" || mime === "image/webp" ? JPEG_QUALITY : undefined,
      );
    });
    if (!blob || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "product";
    return new File([blob], `${base}.${extensionForMime(mime)}`, {
      type: mime,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
