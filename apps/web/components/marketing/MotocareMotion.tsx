"use client";

import { useEffect } from "react";

const SCROLL_REFRESH_EVENT = "vonos:scroll-refresh";

function isMarqueeNode(node: Element): boolean {
  return (
    node.classList.contains("marquee-list") ||
    node.classList.contains("footer-marquee-list") ||
    node.classList.contains("marquee-item") ||
    node.classList.contains("footer-marquee") ||
    !!node.closest(".marquee-list, .footer-marquee-list")
  );
}

function withoutMarqueeNodes(nodes: NodeListOf<Element> | Element[]): Element[] {
  return Array.from(nodes).filter((node) => !isMarqueeNode(node));
}

/** Dispatch after async DOM updates (e.g. shop catalog load) so ScrollTrigger picks up new nodes. */
export function refreshMarketingScroll(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SCROLL_REFRESH_EVENT));
}

export default function MotocareMotion() {
  useEffect(() => {
    let lenis: { destroy: () => void; raf: (time: number) => void } | undefined;
    let gsapCtx: { revert: () => void } | undefined;
    let sectionTriggers: Array<{ kill: () => void }> = [];
    let revealTriggers: Array<{ kill: () => void }> = [];

    const boot = async () => {
      const [{ default: Lenis }, gsapModule, { ScrollTrigger }] = await Promise.all([
        import("lenis"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);

      const gsap = gsapModule.default;
      gsap.registerPlugin(ScrollTrigger);

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion) {
        document.documentElement.classList.add("vonos-reduced-motion");
        return;
      }

      const smoothScroll = new Lenis({ smoothWheel: true, lerp: 0.1, wheelMultiplier: 1 });
      lenis = smoothScroll;
      smoothScroll.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => smoothScroll.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);

      const revealFrom = {
        opacity: 0,
        y: 32,
        scale: 0.94,
        transformOrigin: "50% 50%",
      };

      const revealTo = {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.85,
        ease: "power3.out",
      };

      const markRevealed = (node: Element) => {
        if (node.hasAttribute("scroll-item")) {
          node.setAttribute("scroll-item", "show");
        }
        node.setAttribute("data-reveal", "show");
      };

      const animateReveal = (targets: gsap.TweenTarget, stagger = 0.14) => {
        gsap.to(targets, {
          ...revealTo,
          stagger,
          overwrite: "auto",
          onComplete() {
            const list = gsap.utils.toArray(targets) as Element[];
            list.forEach(markRevealed);
          },
        });
      };

      const bindSectionScrollItems = () => {
        sectionTriggers.forEach((trigger) => trigger.kill());
        sectionTriggers = [];

        document.querySelectorAll('[data-scroll="load"]').forEach((section) => {
          const items = withoutMarqueeNodes(
            section.querySelectorAll(
              "[scroll-item]:not([scroll-item='show']), [data-reveal]:not([data-reveal='show'])",
            ),
          );
          if (items.length === 0) return;

          gsap.set(items, revealFrom);

          const trigger = ScrollTrigger.create({
            trigger: section,
            start: "top 82%",
            once: true,
            onEnter: () => animateReveal(items, 0.12),
          });
          sectionTriggers.push(trigger);
        });
      };

      const bindRevealNodes = () => {
        revealTriggers.forEach((trigger) => trigger.kill());
        revealTriggers = [];

        const nodes = document.querySelectorAll(
          [
            ".shop-card:not([data-reveal='show'])",
            ".shop-checkout-panel:not([data-reveal='show'])",
            ".shop-confirmation-card:not([data-reveal='show'])",
            ".track-panel:not([data-reveal='show'])",
            ".shop-catalog-header:not([data-reveal='show'])",
          ].join(", "),
        );

        nodes.forEach((node) => {
          gsap.set(node, revealFrom);

          const trigger = ScrollTrigger.create({
            trigger: node,
            start: "top 88%",
            once: true,
            onEnter: () => animateReveal(node),
          });
          revealTriggers.push(trigger);
        });
      };

      gsapCtx = gsap.context(() => {
        const heroItems = withoutMarqueeNodes(
          document.querySelectorAll("[data-show]:not([data-show='show'])"),
        );
        gsap.set(heroItems, revealFrom);

        gsap.to(heroItems, {
          ...revealTo,
          stagger: 0.16,
          delay: 0.08,
          onComplete() {
            heroItems.forEach((node) => node.setAttribute("data-show", "show"));
          },
        });

        bindSectionScrollItems();
        bindRevealNodes();
      });

      const handleRefresh = () => {
        bindSectionScrollItems();
        bindRevealNodes();
        ScrollTrigger.refresh();
      };

      window.addEventListener(SCROLL_REFRESH_EVENT, handleRefresh);
      window.addEventListener("load", handleRefresh);

      return () => {
        window.removeEventListener(SCROLL_REFRESH_EVENT, handleRefresh);
        window.removeEventListener("load", handleRefresh);
      };
    };

    let cleanupListeners: (() => void) | undefined;

    void boot().then((cleanup) => {
      cleanupListeners = cleanup;
    });

    return () => {
      cleanupListeners?.();
      sectionTriggers.forEach((trigger) => trigger.kill());
      revealTriggers.forEach((trigger) => trigger.kill());
      gsapCtx?.revert();
      lenis?.destroy();
    };
  }, []);

  return null;
}
