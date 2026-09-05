"use client";

import { gsap } from "gsap";
import { useEffect } from "react";

function accordionContent(node: Element) {
  return node.querySelector<HTMLElement>(".accordion-content");
}

function accordionIcon(node: Element) {
  return node.querySelector<HTMLElement>(".accordion-divider-vr");
}

function prefersReducedMotion() {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.classList.contains("vonos-reduced-motion")
  );
}

function setAccordionOpen(node: Element, open: boolean, animate: boolean) {
  const content = accordionContent(node);
  const icon = accordionIcon(node);
  if (!content) return;

  const duration = animate && !prefersReducedMotion() ? 0.42 : 0;

  gsap.killTweensOf(content);
  if (icon) gsap.killTweensOf(icon);

  if (open) {
    gsap.set(content, { overflow: "hidden", display: "block" });
    if (duration === 0) {
      gsap.set(content, { height: "auto", opacity: 1, paddingBottom: 16 });
      if (icon) gsap.set(icon, { rotation: -90 });
      return;
    }

    const startHeight = content.getBoundingClientRect().height;
    const prevHeight = content.style.height;
    content.style.height = "auto";
    const target = content.scrollHeight;
    content.style.height = prevHeight;

    gsap.fromTo(
      content,
      { height: startHeight, opacity: startHeight > 0 ? 1 : 0, paddingBottom: startHeight > 0 ? 16 : 0 },
      {
        height: target,
        opacity: 1,
        paddingBottom: 16,
        duration,
        ease: "power2.out",
        onComplete: () => {
          gsap.set(content, { height: "auto" });
        },
      },
    );
    if (icon) {
      gsap.to(icon, { rotation: -90, duration: duration * 0.85, ease: "power2.out" });
    }
    return;
  }

  gsap.to(content, {
    height: 0,
    opacity: 0,
    paddingBottom: 0,
    duration,
    ease: "power2.inOut",
  });
  if (icon) {
    gsap.to(icon, { rotation: 0, duration: duration * 0.85, ease: "power2.inOut" });
  }
}

export default function WebflowClientEffects() {
  useEffect(() => {
    const lists = document.querySelectorAll(".faqs-right");
    lists.forEach((list) => {
      list.querySelectorAll(".accordion-item, .accordion-active-item").forEach((node) => {
        setAccordionOpen(node, node.classList.contains("accordion-active-item"), false);
      });
    });

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const accordionTrigger = target.closest(".accordion-item, .accordion-active-item");
      if (!accordionTrigger?.querySelector(".accordion-heading")?.contains(target)) return;

      const list = accordionTrigger.closest(".faqs-right");
      if (!list) return;

      const wasOpen = accordionTrigger.classList.contains("accordion-active-item");

      list.querySelectorAll(".accordion-active-item").forEach((node) => {
        node.classList.remove("accordion-active-item");
        node.classList.add("accordion-item");
        setAccordionOpen(node, false, true);
      });

      if (wasOpen) return;

      accordionTrigger.classList.remove("accordion-item");
      accordionTrigger.classList.add("accordion-active-item");
      setAccordionOpen(accordionTrigger, true, true);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
