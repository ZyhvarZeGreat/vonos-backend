import ScrapedSection from "@/components/marketing/ScrapedSection";

const ICON = "/images/ui/ticker-sep.svg";

const ITEM = `<div class="marquee-item"><div class="text-sm-uppercase text-gray-3">12-month warranty</div><img src="${ICON}" loading="lazy" alt="" class="marquee-icon"><div class="text-sm-uppercase text-gray-3">Fixed-price quotes</div><img src="${ICON}" loading="lazy" alt="" class="marquee-icon"><div class="text-sm-uppercase text-gray-3">★ 4.9 / 412 reviews</div><img src="${ICON}" loading="lazy" alt="" class="marquee-icon"><div class="text-sm-uppercase text-gray-3">Free local collection</div><img src="${ICON}" loading="lazy" alt="" class="marquee-icon"><div class="text-sm-uppercase text-gray-3">No upsells, ever</div><img src="${ICON}" loading="lazy" alt="" class="marquee-icon"><div class="text-sm-uppercase text-gray-3">All makes welcome</div><img src="${ICON}" loading="lazy" alt="" class="marquee-icon"><div class="text-sm-uppercase text-gray-3">Genuine parts only</div><img src="${ICON}" loading="lazy" alt="" class="marquee-icon"><div class="text-sm-uppercase text-gray-3">17 years trusted</div><img src="${ICON}" loading="lazy" alt="" class="marquee-icon"><div class="text-sm-uppercase text-gray-3">Same-day diagnostics</div><img src="${ICON}" loading="lazy" alt="" class="marquee-icon"><div class="text-sm-uppercase text-gray-3">Dealer-level kit</div><img src="${ICON}" loading="lazy" alt="" class="marquee-icon"></div>`;

const SECTION_HTML = `<section class="marquee-section"><div class="container-full"><div data-show="" class="marquee-list">${ITEM}${ITEM}${ITEM}<div class="marquee-overlay"></div></div></div></section>`;

export default function MarqueeSection() {
  return <ScrapedSection html={SECTION_HTML} qa="02-marquee" />;
}
