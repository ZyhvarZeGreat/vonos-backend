"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { resolveProductImageUrl } from "@/lib/utils/legacyMediaUrl";

type ProductThumbnailProps = {
  src?: string | null;
  alt: string;
  className?: string;
  /** Fixed square edge in px — keeps list rows aligned. */
  size?: number;
};

/**
 * Product list thumbnail: always reserves a fixed square so missing/broken
 * images leave a placeholder box of the same dimensions.
 */
export function ProductThumbnail({
  src,
  alt,
  className,
  size = 50,
}: ProductThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveProductImageUrl(src);

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  const showImage = Boolean(resolved) && !failed;
  const boxStyle = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
  } as const;

  if (!showImage) {
    return (
      <span
        className={cn(
          "product-thumbnail-small product-thumbnail-placeholder",
          className,
        )}
        style={boxStyle}
        title="No image"
        aria-hidden
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved!}
      alt={alt}
      className={cn("product-thumbnail-small", className)}
      style={{ ...boxStyle, objectFit: "cover" }}
      onError={() => setFailed(true)}
    />
  );
}
