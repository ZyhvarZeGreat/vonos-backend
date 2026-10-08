// AUTO-GENERATED from standalone scrape — do not edit by hand
// Regenerate: npm run prepare:subpages

import ScrapedSection from "@/components/marketing/ScrapedSection";
import { CDN_BASE } from "@/lib/cdn";

const SECTION_HTML = `<section data-scroll="load" class="section-spacing-bottom"><div class="container-full"><div class="case-study-content"><div scroll-item="" class="section-title"><h2 class="no-margin-bottom">Real repairs. Real results.</h2></div><div scroll-item="" class="case-study-card"><img src="${CDN_BASE}/images/vonos-photos/IMG_3343-w800.jpg" loading="lazy" sizes="(max-width: 1920px) 100vw, 1920px" srcset="${CDN_BASE}/images/vonos-photos/IMG_3343-w500.jpg 500w, ${CDN_BASE}/images/vonos-photos/IMG_3343-w800.jpg 800w, ${CDN_BASE}/images/vonos-photos/IMG_3343-w1200.jpg 1080w, ${CDN_BASE}/images/vonos-photos/IMG_3343-w1200.jpg 1600w, ${CDN_BASE}/images/vonos-photos/IMG_3343-w1200.jpg 1920w" alt="dashboard" class="case-study-image"><div class="case-study-item"><div class="case-study-top"><div class="case-study-header"><h3 class="text-white no-margin-bottom">BMW 320D</h3><div class="case-study-text">Engine performance restoration</div></div><div class="w-layout-grid grid-case-study-info"><div class="case-info-item"><div class="case-info-title">Issue:</div><div class="text-white">Engine warning light</div></div><div class="case-info-item"><div class="case-info-title">Diagnosis:</div><div class="text-white">Faulty EGR valve</div></div><div><div class="case-info-item"><div class="case-info-title">Repair Time:</div><div class="text-white">4 Hours</div></div></div></div></div><div class="case-study-bottom"><p class="case-client-review">"The team diagnosed the issue quickly, explained every step, and had my car back on the road sooner than expected."</p><div class="case-client-name">— Alex Carter</div><a href="/contact" class="button-primary w-inline-block"><div class="button-title">Book a diagnosis</div><div class="button-hover-bg"></div></a></div></div></div></div></div></section>`;

export default function CaseStudiesSection() {
  return <ScrapedSection html={SECTION_HTML} qa="07-case-studies" />;
}
