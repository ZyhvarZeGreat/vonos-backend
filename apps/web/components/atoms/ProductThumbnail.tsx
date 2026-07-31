"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

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
  const showImage = Boolean(src) && !failed;
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
      src={src!}
      alt={alt}
      className={cn("product-thumbnail-small", className)}
      style={{ ...boxStyle, objectFit: "cover" }}
      onError={() => setFailed(true)}
    />
  );
}
