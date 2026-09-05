"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import CardNav, { type CardNavItem } from "@/components/marketing/CardNav";
import { BRAND } from "@/lib/marketing/asset-map";
import { CART_ADDED_EVENT, useShopCart } from "@/stores/shopCartStore";

const PHONE_HREF = "tel:+12025550147";

type CartAddedDetail = {
  name?: string;
};

export default function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [shake, setShake] = useState(false);
  const [toast, setToast] = useState("");
  const pathname = usePathname();
  const { count, hydrated } = useShopCart();
  const cartCount = hydrated ? count : 0;

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let shakeTimer = 0;
    let toastTimer = 0;

    const onCartAdded = (event: Event) => {
      const detail = (event as CustomEvent<CartAddedDetail>).detail;
      const label = detail?.name ? `${detail.name} added to basket` : "Added to basket";

      setShake(true);
      setToast(label);
      window.clearTimeout(shakeTimer);
      window.clearTimeout(toastTimer);
      shakeTimer = window.setTimeout(() => setShake(false), 700);
      toastTimer = window.setTimeout(() => setToast(""), 2400);
    };

    window.addEventListener(CART_ADDED_EVENT, onCartAdded);
    return () => {
      window.removeEventListener(CART_ADDED_EVENT, onCartAdded);
      window.clearTimeout(shakeTimer);
      window.clearTimeout(toastTimer);
    };
  }, []);

  const items = useMemo<CardNavItem[]>(
    () => [
      {
        label: "Explore",
        bgColor: "#1e40af",
        textColor: "#ffffff",
        links: [
          { label: "Home", href: "/", ariaLabel: "Vonos home" },
          { label: "Services", href: "/services", ariaLabel: "Our services" },
          { label: "About", href: "/about", ariaLabel: "About Vonos" },
        ],
      },
      {
        label: "Shop & track",
        bgColor: "#1d4ed8",
        textColor: "#ffffff",
        links: [
          { label: "Parts shop", href: "/shop", ariaLabel: "Browse parts shop" },
          { label: "Track repair", href: "/track", ariaLabel: "Track my vehicle" },
        ],
      },
      {
        label: "Contact",
        bgColor: "#1e3a8a",
        textColor: "#ffffff",
        links: [
          { label: "Book your car in", href: "/contact", ariaLabel: "Book your car in" },
          { label: "Call workshop", href: PHONE_HREF, ariaLabel: "Call the workshop" },
        ],
      },
    ],
    [],
  );

  return (
    <header
      className={`vonos-card-nav-shell${scrolled ? " is-scrolled" : ""}${shake ? " is-cart-shake" : ""}`}
      role="banner"
      data-qa-section="00-nav"
    >
      <CardNav
        logo={BRAND.logo}
        logoAlt="Vonos logo"
        items={items}
        resetKey={pathname}
        baseColor="#ffffff"
        menuColor="#1e3a8a"
        buttonBgColor="#dc2626"
        buttonTextColor="#ffffff"
        ctaHref="/contact"
        ctaLabel="Book your car in"
        cartCount={cartCount}
        cartHref="/shop/cart"
        className="vonos-card-nav"
      />
      {toast ? (
        <div className="vonos-nav-toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}
    </header>
  );
}
