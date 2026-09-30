"use client";

import { useEffect, useState } from "react";

type HeroBgCarouselProps = {
  images: readonly string[];
  /** Interval between slides (ms). */
  intervalMs?: number;
  className?: string;
  imageClassName?: string;
  alt?: string;
};

export default function HeroBgCarousel({
  images,
  intervalMs = 5500,
  className = "hero-bg-item",
  imageClassName = "hero-bg-image",
  alt = "",
}: HeroBgCarouselProps) {
  const slides = images.filter(Boolean);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [slides.length, intervalMs]);

  if (slides.length === 0) return null;

  return (
    <div className={className} aria-hidden={slides.length > 1 ? true : undefined}>
      {slides.map((src, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          className={imageClassName}
          src={src}
          alt={alt}
          sizes="(max-width: 1920px) 100vw, 1920px"
          fetchPriority={index === 0 ? "high" : "low"}
          loading={index === 0 ? "eager" : "lazy"}
          style={{
            opacity: index === active ? 1 : 0,
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "opacity 900ms ease",
            zIndex: index === active ? 1 : 0,
          }}
        />
      ))}
      <div className="hero-bg-overlay" style={{ zIndex: 2 }} />
      <div className="hero-bg-overlay _02" style={{ zIndex: 2 }} />
    </div>
  );
}
