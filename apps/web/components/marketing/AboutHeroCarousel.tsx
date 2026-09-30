"use client";

import { useEffect, useState } from "react";

type AboutHeroCarouselProps = {
  images: readonly string[];
  intervalMs?: number;
};

/** Crossfade carousel for Motocare `.hero-about-image` slots (Academy / About-style heroes). */
export default function AboutHeroCarousel({
  images,
  intervalMs = 5500,
}: AboutHeroCarouselProps) {
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
    <div className="hero-about-carousel" data-show="show">
      {slides.map((src, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          className="hero-about-image"
          src={src}
          alt=""
          sizes="(max-width: 1920px) 100vw, 1920px"
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
    </div>
  );
}
