import { ArrowUpRight, BatteryCharging, CircleGauge, Disc3, Droplets, MonitorSmartphone, Cpu } from "lucide-react";
import Link from "next/link";

import { SHOP_HERO_IMAGE } from "@/lib/marketing/vonos-photos";

const CATEGORIES = [
  { label: "Tyres", icon: Disc3, href: "/shop?q=tyre" },
  { label: "Engine", icon: Cpu, href: "/shop?q=engine" },
  { label: "Batteries", icon: BatteryCharging, href: "/shop?q=battery" },
  { label: "Oil", icon: Droplets, href: "/shop?q=oil" },
  { label: "Brake", icon: CircleGauge, href: "/shop?q=brake" },
  { label: "Diagnostics", icon: MonitorSmartphone, href: "/shop?q=sensor" },
] as const;

export default function EcomHero() {
  return (
    <section className="vg-hero" data-node-id="19:1300" data-qa-section="shop-hero">
      <div className="vg-hero__bg" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SHOP_HERO_IMAGE} alt="" fetchPriority="high" />
      </div>

      <div className="vg-container">
        <div className="vg-hero__content">
          <p className="vg-hero__eyebrow">Automotive Essentials —</p>
          <h1 className="vg-hero__title">Throttle Position Sensor</h1>
          <p className="vg-hero__lead">
            Real-time throttle feedback keeps the ECU on spec for fuel delivery and ignition
            timing. We stock OE-grade sensors — delivered nationwide or fitted in the Abuja
            workshop the same day.
          </p>
          <div className="vg-hero__actions">
            <Link href="/shop#shop-catalog" className="vg-btn">
              Shop Parts
            </Link>
            <Link href="/shop#shop-featured" className="vg-textlink">
              Explore Collection
              <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden />
            </Link>
          </div>

          <ul className="vg-hero__cats" aria-label="Part categories">
            {CATEGORIES.map(({ label, icon: Icon, href }) => (
              <li key={label}>
                <Link href={href} className="vg-hero__cat">
                  <Icon size={36} strokeWidth={1.1} aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
