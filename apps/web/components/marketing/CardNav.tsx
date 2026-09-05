"use client";

import { ArrowUpRight, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";

import "./CardNav.css";

export type CardNavLink = {
  label: string;
  href: string;
  ariaLabel: string;
};

export type CardNavItem = {
  label: string;
  bgColor: string;
  textColor: string;
  links: CardNavLink[];
};

type CardNavProps = {
  logo: string;
  logoAlt?: string;
  logoHref?: string;
  items: CardNavItem[];
  className?: string;
  ease?: string;
  baseColor?: string;
  menuColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  ctaHref?: string;
  ctaLabel?: string;
  resetKey?: string;
  cartCount?: number;
  cartHref?: string;
};

const BAR_COMPACT_H = 60;
const BAR_FULL_H = 60;
const MENU_H = 260;
const BAR_DURATION = 0.48;

function usesHoverCompact() {
  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(max-width: 768px)").matches
  );
}

function fullBarWidth() {
  return Math.min(window.innerWidth * 0.9, 880, Math.max(window.innerWidth - 32, 280));
}

function compactBarWidth() {
  return Math.max(280, Math.min(window.innerWidth * 0.45, 440));
}

function NavLink({ link, onNavigate }: { link: CardNavLink; onNavigate: () => void }) {
  const content = (
    <>
      <ArrowUpRight className="nav-card-link-icon" aria-hidden="true" />
      {link.label}
    </>
  );

  if (link.href.startsWith("/")) {
    return (
      <Link
        href={link.href}
        className="nav-card-link"
        aria-label={link.ariaLabel}
        onClick={onNavigate}
      >
        {content}
      </Link>
    );
  }

  return (
    <a href={link.href} className="nav-card-link" aria-label={link.ariaLabel} onClick={onNavigate}>
      {content}
    </a>
  );
}

export default function CardNav({
  logo,
  logoAlt = "Logo",
  logoHref = "/",
  items,
  className = "",
  ease = "power3.out",
  baseColor = "#fff",
  menuColor,
  buttonBgColor,
  buttonTextColor,
  ctaHref = "/contact",
  ctaLabel = "Get Started",
  resetKey,
  cartCount = 0,
  cartHref = "/shop/cart",
}: CardNavProps) {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBarHovered, setIsBarHovered] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const hoveredRef = useRef(false);
  const expandedRef = useRef(false);

  const isWide = isBarHovered || isExpanded;

  const menuHeight = () => {
    const navEl = navRef.current;
    if (!navEl) return MENU_H;

    if (!window.matchMedia("(max-width: 768px)").matches) return MENU_H;

    const contentEl = navEl.querySelector<HTMLElement>(".card-nav-content");
    if (!contentEl) return MENU_H;

    const prev = {
      visibility: contentEl.style.visibility,
      pointerEvents: contentEl.style.pointerEvents,
      position: contentEl.style.position,
      height: contentEl.style.height,
    };
    contentEl.style.visibility = "visible";
    contentEl.style.pointerEvents = "auto";
    contentEl.style.position = "static";
    contentEl.style.height = "auto";
    const contentHeight = contentEl.scrollHeight;
    contentEl.style.visibility = prev.visibility;
    contentEl.style.pointerEvents = prev.pointerEvents;
    contentEl.style.position = prev.position;
    contentEl.style.height = prev.height;
    return BAR_FULL_H + contentHeight + 16;
  };

  const cards = () => cardsRef.current.filter(Boolean);

  const tweenBar = (wide: boolean) => {
    const container = containerRef.current;
    const navEl = navRef.current;
    if (!container || !navEl || expandedRef.current) return;

    const compact = usesHoverCompact();
    gsap.to(container, {
      width: !compact || wide ? fullBarWidth() : compactBarWidth(),
      maxWidth: !compact || wide ? fullBarWidth() : compactBarWidth(),
      duration: BAR_DURATION,
      ease,
      overwrite: "auto",
    });
    gsap.to(navEl, {
      height: !compact || wide ? BAR_FULL_H : BAR_COMPACT_H,
      duration: BAR_DURATION,
      ease,
      overwrite: "auto",
    });
  };

  const openMenu = () => {
    const container = containerRef.current;
    const navEl = navRef.current;
    if (!container || !navEl) return;

    expandedRef.current = true;
    setIsHamburgerOpen(true);
    setIsExpanded(true);

    gsap.killTweensOf([container, navEl, ...cards()]);
    gsap.to(container, {
      width: fullBarWidth(),
      maxWidth: fullBarWidth(),
      duration: BAR_DURATION,
      ease,
      overwrite: true,
    });
    gsap.to(navEl, {
      height: menuHeight(),
      duration: BAR_DURATION,
      ease,
      overwrite: true,
    });
    gsap.to(cards(), {
      y: 0,
      autoAlpha: 1,
      duration: 0.38,
      ease,
      stagger: 0.07,
      delay: 0.2,
      overwrite: true,
    });
  };

  const closeMenu = () => {
    if (!expandedRef.current) return;

    const container = containerRef.current;
    const navEl = navRef.current;
    if (!container || !navEl) return;

    expandedRef.current = false;
    setIsHamburgerOpen(false);
    setIsExpanded(false);

    const stayWide = usesHoverCompact() && hoveredRef.current;
    const compact = usesHoverCompact();

    gsap.killTweensOf([container, navEl, ...cards()]);
    gsap.to(cards(), {
      y: 28,
      autoAlpha: 0,
      duration: 0.22,
      ease,
      overwrite: true,
    });
    gsap.to(navEl, {
      height: stayWide || !compact ? BAR_FULL_H : BAR_COMPACT_H,
      duration: BAR_DURATION,
      ease,
      overwrite: true,
    });
    gsap.to(container, {
      width: stayWide || !compact ? fullBarWidth() : compactBarWidth(),
      maxWidth: stayWide || !compact ? fullBarWidth() : compactBarWidth(),
      duration: BAR_DURATION,
      ease,
      overwrite: true,
    });
  };

  const syncIdleSize = () => {
    const container = containerRef.current;
    const navEl = navRef.current;
    if (!container || !navEl) return;

    const compact = usesHoverCompact();
    const wide = hoveredRef.current || expandedRef.current;

    gsap.set(container, {
      width: !compact || wide ? fullBarWidth() : compactBarWidth(),
      maxWidth: !compact || wide ? fullBarWidth() : compactBarWidth(),
    });

    if (expandedRef.current) {
      gsap.set(navEl, { height: menuHeight(), overflow: "hidden" });
      gsap.set(cards(), { y: 0, autoAlpha: 1 });
      return;
    }

    gsap.set(navEl, {
      height: !compact || wide ? BAR_FULL_H : BAR_COMPACT_H,
      overflow: "hidden",
    });
    gsap.set(cards(), { y: 28, autoAlpha: 0 });
  };

  useLayoutEffect(() => {
    syncIdleSize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ease, items]);

  useLayoutEffect(() => {
    window.addEventListener("resize", syncIdleSize);
    return () => window.removeEventListener("resize", syncIdleSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    closeMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    if (!isExpanded) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  const onBarEnter = () => {
    hoveredRef.current = true;
    setIsBarHovered(true);
    if (!expandedRef.current) tweenBar(true);
  };

  const onBarLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && containerRef.current?.contains(next)) return;

    hoveredRef.current = false;
    setIsBarHovered(false);
    if (!expandedRef.current) tweenBar(false);
  };

  const toggleMenu = () => {
    if (!expandedRef.current) {
      openMenu();
      return;
    }
    closeMenu();
  };

  const setCardRef = (i: number) => (el: HTMLDivElement | null) => {
    cardsRef.current[i] = el;
  };

  const ctaButton: ReactNode = (
    <div className="card-nav-actions">
      <Link
        href={cartHref}
        className={`card-nav-cart${cartCount > 0 ? " has-items" : ""}`}
        aria-label={cartCount > 0 ? `Basket, ${cartCount} items` : "Basket"}
        onClick={closeMenu}
      >
        <ShoppingBag size={18} aria-hidden="true" />
        {cartCount > 0 ? <span className="card-nav-cart-badge">{cartCount > 99 ? "99+" : cartCount}</span> : null}
      </Link>
      <Link
        href={ctaHref}
        className="card-nav-cta-button"
        style={{ backgroundColor: buttonBgColor, color: buttonTextColor }}
        onClick={closeMenu}
      >
        {ctaLabel}
      </Link>
    </div>
  );

  return (
    <>
      <button
        type="button"
        className={`card-nav-backdrop${isExpanded ? " card-nav-backdrop--visible" : ""}`}
        aria-label="Close menu"
        tabIndex={isExpanded ? 0 : -1}
        onClick={closeMenu}
      />
      <div
        ref={containerRef}
        className={`card-nav-container${isExpanded ? " is-open" : ""}${isWide ? " is-wide" : ""} ${className}`.trim()}
        onPointerEnter={onBarEnter}
        onPointerLeave={onBarLeave}
      >
        <nav
          ref={navRef}
          className={`card-nav ${isExpanded ? "open" : ""}`}
          style={{ backgroundColor: baseColor }}
        >
          <div className="card-nav-top">
            <div className="logo-container">
              <Link href={logoHref} className="logo-link" aria-label={`${logoAlt} home`} onClick={closeMenu}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt={logoAlt} className="logo" />
              </Link>
            </div>

            <button
              type="button"
              className={`hamburger-menu ${isHamburgerOpen ? "open" : ""}`}
              onClick={toggleMenu}
              aria-label={isExpanded ? "Close menu" : "Open menu"}
              aria-expanded={isExpanded}
              style={{ color: menuColor || "#000" }}
            >
              <div className="hamburger-line" />
              <div className="hamburger-line" />
            </button>

            {ctaButton}
          </div>

          <div className="card-nav-content" aria-hidden={!isExpanded}>
            {items.slice(0, 3).map((item, idx) => (
              <div
                key={`${item.label}-${idx}`}
                className="nav-card"
                ref={setCardRef(idx)}
                style={{ backgroundColor: item.bgColor, color: item.textColor }}
              >
                <div className="nav-card-label">{item.label}</div>
                <div className="nav-card-links">
                  {item.links.map((lnk, i) => (
                    <NavLink key={`${lnk.label}-${i}`} link={lnk} onNavigate={closeMenu} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}
