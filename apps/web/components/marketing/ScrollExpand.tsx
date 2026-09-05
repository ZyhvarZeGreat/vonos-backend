"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import "./ScrollExpand.css";

gsap.registerPlugin(ScrollTrigger);

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

type ScrollExpandProps = {
  src?: string;
  mediaType?: "image" | "video";
  poster?: string;
  alt?: string;
  title?: string;
  scrollHint?: string;
  startWidth?: number;
  startHeight?: number;
  startRadius?: number;
  endRadius?: number;
  mediaZoom?: number;
  scrollDistance?: number;
  holdDistance?: number;
  smoothing?: number;
  overlayScrim?: number;
  minScrim?: number;
  useWindowScroll?: boolean;
  /** Override sticky stage height (px) when using window scroll. */
  stageHeightPx?: number;
  enabled?: boolean;
  children?: ReactNode;
  /** Always-visible layer above the media (not tied to expand progress). */
  fixedOverlay?: ReactNode;
  className?: string;
  style?: CSSProperties;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "className" | "style">;

export default function ScrollExpand({
  src = "",
  mediaType = "image",
  poster = "",
  alt = "",
  title = "",
  scrollHint = "",
  startWidth = 42,
  startHeight = 58,
  startRadius = 24,
  endRadius = 0,
  mediaZoom = 1.35,
  scrollDistance = 1.2,
  holdDistance = 0.35,
  smoothing = 0.1,
  overlayScrim = 0.45,
  minScrim = 0,
  useWindowScroll = false,
  stageHeightPx,
  enabled = true,
  children,
  fixedOverlay,
  className = "",
  style,
  ...rest
}: ScrollExpandProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  const propsRef = useRef({
    startWidth,
    startHeight,
    startRadius,
    endRadius,
    mediaZoom,
    scrollDistance,
    holdDistance,
    smoothing,
    overlayScrim,
    minScrim,
    useWindowScroll,
    stageHeightPx,
    enabled,
  });
  propsRef.current = {
    startWidth,
    startHeight,
    startRadius,
    endRadius,
    mediaZoom,
    scrollDistance,
    holdDistance,
    smoothing,
    overlayScrim,
    minScrim,
    useWindowScroll,
    stageHeightPx,
    enabled,
  };

  const applyProgress = useCallback((expandP: number, textP?: number) => {
    const frame = frameRef.current;
    const media = mediaRef.current;
    if (!frame || !media) return;
    const c = propsRef.current;

    const e = smoothstep(0, 1, expandP);
    const textReveal = textP ?? smoothstep(0.68, 1, expandP);

    const w = c.startWidth + (100 - c.startWidth) * e;
    const h = c.startHeight + (100 - c.startHeight) * e;
    const ix = Math.max(0, (100 - w) / 2);
    const iy = Math.max(0, (100 - h) / 2);
    const r = c.startRadius + (c.endRadius - c.startRadius) * e;
    frame.style.clipPath = `inset(${iy}% ${ix}% ${iy}% ${ix}% round ${r}px)`;

    media.style.transform = `scale(${c.mediaZoom + (1 - c.mediaZoom) * e})`;

    if (scrimRef.current) {
      scrimRef.current.style.opacity = `${Math.max(c.minScrim, c.overlayScrim * textReveal)}`;
    }

    if (titleRef.current) {
      const out = smoothstep(0.4, 0.88, expandP);
      titleRef.current.style.opacity = `${1 - out}`;
      titleRef.current.style.transform = `translate3d(0, ${-28 * out}px, 0) scale(${1 + 0.06 * out})`;
    }

    if (hintRef.current) {
      const gone = smoothstep(0, 0.12, expandP);
      hintRef.current.style.opacity = `${1 - gone}`;
      hintRef.current.style.transform = `translate3d(0, ${8 * gone}px, 0)`;
    }

    if (overlayRef.current) {
      overlayRef.current.style.opacity = `${textReveal}`;
      overlayRef.current.style.transform = `translate3d(0, ${18 * (1 - textReveal)}px, 0)`;
      overlayRef.current.style.pointerEvents = textReveal > 0.08 ? "auto" : "none";
      overlayRef.current.style.visibility = textReveal > 0.01 ? "visible" : "hidden";
    }
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!root || !track || !stage) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let current = 0;
    let target = 0;
    let stageH = 0;
    let running = false;
    let scrollTrigger: ScrollTrigger | null = null;

    const measure = () => {
      const c = propsRef.current;
      if (c.useWindowScroll) {
        stageH = c.stageHeightPx ?? window.innerHeight;
      } else {
        stageH = root.clientHeight;
      }
      if (stageH <= 0) return;
      stage.style.height = `${stageH}px`;
      if (c.useWindowScroll) {
        track.style.height = `${stageH * (1 + Math.max(0, c.scrollDistance) + Math.max(0, c.holdDistance))}px`;
      } else {
        track.style.height = `${stageH * (1 + Math.max(0, c.scrollDistance) + Math.max(0, c.holdDistance))}px`;
      }

      const w = root.clientWidth || stageH;
      stage.style.setProperty("--se-title-size", `${clamp(w * 0.075, 20, 84)}px`);
    };

    const readProgress = () => {
      const c = propsRef.current;
      if (!c.enabled) return 1;
      const span = stageH * Math.max(0.01, c.scrollDistance);
      if (c.useWindowScroll) {
        const top = track.getBoundingClientRect().top;
        return clamp(-top / span, 0, 1);
      }
      return clamp(root.scrollTop / span, 0, 1);
    };

    const tick = () => {
      const c = propsRef.current;
      const k = c.smoothing <= 0 ? 1 : 1 - Math.exp(-1 / (60 * c.smoothing));
      current += (target - current) * k;
      if (Math.abs(target - current) < 0.0004) {
        current = target;
        running = false;
      }
      applyProgress(current);
      raf = running ? requestAnimationFrame(tick) : 0;
    };

    const kick = () => {
      if (running) return;
      running = true;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      target = readProgress();
      if (propsRef.current.smoothing <= 0 || reduceMotion) {
        current = target;
        applyProgress(current);
        return;
      }
      kick();
    };

    const onResize = () => {
      measure();
      if (scrollTrigger) {
        ScrollTrigger.refresh();
        return;
      }
      target = readProgress();
      current = target;
      applyProgress(current);
    };

    measure();

    if (reduceMotion || !propsRef.current.enabled) {
      applyProgress(1, 1);
      return;
    }

    if (useWindowScroll) {
      scrollTrigger = ScrollTrigger.create({
        trigger: track,
        start: "top top",
        end: () => {
          const c = propsRef.current;
          const h = c.stageHeightPx ?? window.innerHeight;
          const scrollSpan = h * Math.max(0.01, c.scrollDistance);
          const holdSpan = h * Math.max(0, c.holdDistance);
          return `+=${scrollSpan + holdSpan}`;
        },
        scrub: propsRef.current.smoothing > 0 ? propsRef.current.smoothing : true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const c = propsRef.current;
          const hold = Math.max(0, c.holdDistance);
          const total = c.scrollDistance + hold || c.scrollDistance;
          const expandPortion = c.scrollDistance / total;

          if (hold <= 0) {
            const expandP = clamp(self.progress, 0, 1);
            applyProgress(expandP, smoothstep(0.92, 1, expandP));
            return;
          }

          const expandP = clamp(self.progress / expandPortion, 0, 1);
          const holdP =
            expandPortion >= 1 ? 0 : clamp((self.progress - expandPortion) / (1 - expandPortion), 0, 1);
          applyProgress(expandP, smoothstep(0, 1, holdP));
        },
      });

      applyProgress(scrollTrigger.progress);
      requestAnimationFrame(() => ScrollTrigger.refresh());
    } else {
      target = readProgress();
      current = target;
      applyProgress(current);

      root.addEventListener("scroll", onScroll, { passive: true });
    }

    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(root);

    const refresh = () => {
      measure();
      ScrollTrigger.refresh();
    };
    window.addEventListener("vonos:scroll-refresh", refresh);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      scrollTrigger?.kill();
      if (!useWindowScroll) {
        root.removeEventListener("scroll", onScroll);
      }
      window.removeEventListener("resize", onResize);
      window.removeEventListener("vonos:scroll-refresh", refresh);
      ro.disconnect();
    };
  }, [applyProgress, useWindowScroll]);

  const media =
    mediaType === "video" ? (
      <video
        ref={mediaRef as React.RefObject<HTMLVideoElement>}
        className="scroll-expand__media"
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
      />
    ) : (
      <img
        ref={mediaRef as React.RefObject<HTMLImageElement>}
        className="scroll-expand__media"
        src={src}
        alt={alt}
        draggable={false}
      />
    );

  return (
    <div
      ref={rootRef}
      className={`scroll-expand ${useWindowScroll ? "scroll-expand--window" : "scroll-expand--scroller"} ${className}`.trim()}
      style={style}
      {...rest}
    >
      <div ref={trackRef} className="scroll-expand__track">
        <div ref={stageRef} className="scroll-expand__stage">
          <div ref={frameRef} className="scroll-expand__frame">
            {media}
            <div ref={scrimRef} className="scroll-expand__scrim" />
            {children ? (
              <div ref={overlayRef} className="scroll-expand__overlay">
                {children}
              </div>
            ) : null}
          </div>
          {fixedOverlay ? (
            <div className="scroll-expand__fixed-overlay">{fixedOverlay}</div>
          ) : null}
          {title ? (
            <div ref={titleRef} className="scroll-expand__title">
              {title}
            </div>
          ) : null}
          {scrollHint ? (
            <div ref={hintRef} className="scroll-expand__hint">
              {scrollHint}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
