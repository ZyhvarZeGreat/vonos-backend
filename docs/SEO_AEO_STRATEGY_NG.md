# Vonos Automotive — SEO & AEO Strategy (Nigeria-localized)

Companion to the generic repair-shop SEO/AEO plan. That plan is structurally
sound; this document records every point where it must be adapted for
**Vonos Automotive, Kubwa, Abuja, Nigeria** — plus what has already been
implemented in `apps/web`.

> Rule: nothing here ships with US placeholders. Currency is ₦, phones are
> +234, areas are Abuja districts, seasons are rainy/dry.

## 0. Blockers — fix before any other SEO work matters

| # | Blocker | Where | Status |
|---|---|---|---|
| 1 | Real workshop phone number. The live site shows placeholder **+1 202 555 0147** (US test number) in the FAQ/contact CTA components | `FaqSection.tsx`, `ContactSiteFooter.tsx` (auto-generated scrape — fix at the `npm run prepare:subpages` source, then regenerate) | TODO |
| 2 | Same placeholder must be replaced in schema + GBP + footer simultaneously (NAP consistency) | `lib/seo/business.ts` (`TODO` markers), GBP listing, footer | TODO |
| 3 | Real street address + Google Maps pin coordinates | `lib/seo/business.ts` | TODO |
| 4 | Decide MOT terminology (Section 7) — until decided, do not build more copy around it | Whole marketing site | TODO |
| 5 | Verify Search Console + Bing Webmaster Tools + GBP Insights access; record 4 weeks of baseline before adopting any traffic/ranking target | Google/Bing | TODO |

Do not submit the sitemap, build citations, or start review SMS until 1–3
are done — every citation with a wrong number actively harms NAP trust.

## 1. What is already implemented (code)

- **Services IA (hybrid):** `/services` hub + 6 detail pages at
  `/services/[slug]` (`lib/marketing/services.ts`,
  `app/(marketing)/services/[slug]/page.tsx`):
  `servicing-mot`, `brakes-suspension`, `diagnostics-electrical`,
  `engine-transmission`, `ac-cooling`, `tires-alignment`. Each has unique
  metadata + canonical, visible breadcrumbs, includes/signs/FAQ sections,
  related-service interlinks, and `Service` + `FAQPage` + `BreadcrumbList`
  JSON-LD. All 6 are in `app/sitemap.ts` (priority 0.8).
- **Hub cross-links:** `ServicesDetailLinksSection` links every detail page
  from the hub (hub cards file is auto-generated — not edited).
- **Homepage:** `AutoRepair` + `FAQPage` JSON-LD
  (`app/(marketing)/page.tsx`). FAQ schema mirrors the visible accordion —
  keep `HOMEPAGE_FAQS` in sync with `FaqSection` if questions change.
- **Blog:** `Article` + `BreadcrumbList` JSON-LD on
  `app/(marketing)/blog/[slug]`; `ArticleView` renders author + published +
  updated dates and uses the post title as hero-image alt.
- **Canonicals:** `/`, `/services`, `/about`, `/contact`, `/academy`,
  `/blog`, `/blog/[slug]`, `/shop/[sku]` all set.
- **Shared helpers:** `lib/seo/schema.ts`
  (`autoRepairJsonLd`, `faqPageJsonLd`, `breadcrumbJsonLd`,
  `serviceJsonLd`, `articleJsonLd`); business identity in
  `lib/seo/business.ts`.
- **Keywords cleaned:** `lib/seo/site.ts` — removed `Paystack auto parts`
  and bare `MOT`; added Abuja/Kubwa/make-specific terms.
- **Authors:** seed posts use `Vonos Technical Team` (truthful interim —
  see Section 5 for the named-author upgrade path).
- **Product pages** (`/shop/[sku]`): `Product`/`Offer` JSON-LD in NGN
  already correct; visible breadcrumbs present.

## 2. Localized keyword strategy

### Service areas (use these, not generic "[city]")

Primary: **Kubwa** (workshop location — every service page targets
`[service] Kubwa` + `[service] Abuja`).
Secondary districts for future geo pages **only if genuinely served**:
Gwarinimpa, Maitama, Wuse, Utako, Jabi, Lugbe, Garki.
Rule from the generic plan stands: one page per area actually served, unique
copy each — no swapped-name duplicates.

### Makes (Nigerian search skews make-specific)

Weight content toward **Toyota, Honda, Lexus, Mercedes-Benz, Hyundai, Kia**
— the volume makes on Abuja roads. Cost guides should be make-aware
("brake pad replacement cost for a Toyota Corolla in Abuja"), not generic.

### Tier 1 — transactional (drives bookings)

- `[service] Kubwa`, `[service] Abuja`, `[service] near me`
- `auto repair shop Kubwa`, `mechanic Abuja`, `car servicing Kubwa`
- `emergency car repair Abuja`, `same day [service] Abuja`
- `[service] price Abuja`, `[service] cost Nigeria` (₦ figures, refreshed
  monthly — see Section 4)

### Tier 2 — research/cost (highest AEO value)

- `how much does [service] cost in Nigeria`
- `Toyota Corolla brake pad price Abuja`
- `genuine vs tokunbo parts` (answer honestly — tokunbo is the real
  comparison shoppers make; a frank genuine-vs-tokunbo guide is a trust and
  citation asset no competitor owns well)
- `[symptom] what does it mean`

### Tier 3 — symptom/diagnostic

Same list as the generic plan (grinding brakes, shaking at speed, check
engine light, no-start clicks, burning smell, pulling) — symptoms are
universal. Localize only the CTA and the road context (e.g. "dusty roads
embed grit in pad material").

### Tier 4 — comparison/trust

- `best auto repair shop Abuja`, `trustworthy mechanic Kubwa`
- `[shop name] reviews`
- Skip manufactured `[competitor] vs Vonos` pages unless the query has real
  volume.

### Tier 5 — maintenance (rainy/dry, not winter)

- `rainy season car maintenance checklist Nigeria`
- `how often should I change oil` (answer in km + months, dusty conditions)
- `harmattan dust car care` (cabin/air filters, paint)
- `pre-road-trip checklist Lagos-Abuja` (long intercity drives are the
  Nigerian equivalent of the generic "road trip" post)

## 3. Content calendar (first quarter, localized)

| # | Title | Type | Notes |
|---|---|---|---|
| 1 | How Much Does Brake Repair Cost in Abuja? (2026 Price Guide) | cost, ₦ | Refresh **monthly** — pad/disc prices track FX |
| 2 | 5 Warning Signs Your Transmission Is Failing | symptom | |
| 3 | Grinding Noise When Braking? What It Means | symptom | Links to `/services/brakes-suspension` |
| 4 | Rainy-Season Car Maintenance Checklist for Abuja Drivers | seasonal | Publish 4–6 weeks before rains |
| 5 | Genuine vs Tokunbo Parts: When Each Makes Sense | trust/cost | Flagship E-E-A-T piece — be frank |
| 6 | How Often Should You Really Change Your Oil? | evergreen | km + months, dusty-condition caveat |
| 7 | AC Not Blowing Cold? Common Causes and Fixes | symptom | Links to `/services/ac-cooling` |
| 8 | Case study: hidden electrical fault, [make/model] | trust | With owner permission, real photos |

Every post: direct-answer first paragraph, named author when available,
visible published + updated dates, internal link to the matching
`/services/[slug]` page, 3–5 question FAQ block.

## 4. Price-freshness policy (Nigeria-specific)

The generic plan says quarterly cost-guide refreshes. **Do monthly here.**
Parts prices move with FX and fuel costs; a ₦ figure more than ~6 weeks old
risks being wrong, and wrong prices hurt AI-citation confidence (engines
down-weight sources with stale numbers). Each cost post shows
"Prices checked: [month year]" near the top.

## 5. E-E-A-T build-out (constraints)

- **No ASE claims.** The generic plan's "ASE-certified" anchor does not
  apply. Use: years in business (site claims independent since 2009 —
  verify), manufacturer training actually completed, supplier authorizations,
  real team names/photos.
- **Author upgrade path:** seed content is bylined `Vonos Technical Team`.
  Graduate to named bylines (`Written by [Name], [role], [years]`) as soon
  as real technicians consent — do not invent credentials.
- **Team identities on the live site** (Dan Whitlock, Marcus Hill, Sofia
  Reyes + Ford Fiesta/Range Rover copy) read as template placeholders.
  Replace with the real Kubwa team before the About page is used as an
  E-E-A-T anchor anywhere.
- **About page** needs: founding story, real team + photos, real shop
  photos (already have Vonos workshop photos — good, keep stock out),
  warranty terms (12-month claim is already in copy — ensure it is the real
  policy), physical address + phone.

## 6. Citations & directories (Nigeria-adapted)

Keep from the generic plan: Google Business Profile, Bing Places, Apple
Maps, Facebook Business Page.
**Drop** unless evidence of Nigerian usage: Angi, BBB, RepairPal, Yelp
(Yelp has negligible Nigerian coverage — low priority, fill once, ignore).
**Add:** VConnect, Finelib, ConnectNigeria, Jiji Business/shop presence,
Nigeria Yellow Pages equivalents, plus automotive-part marketplace profiles
that match the `/shop` business. Track all in one NAP spreadsheet; the NAP
must equal `lib/seo/business.ts` + footer character-for-character.

## 7. Open terminology decision: MOT

The live site says "MOT testing" across services metadata and cards. MOT is
a UK inspection regime. Options:

1. Keep "MOT" as a brand shorthand for the in-house multi-point inspection
   (define it once on the servicing page), or
2. Rename to "vehicle inspection / roadworthiness check" (VIO roadworthiness
   is the Nigerian frame of reference).

Pick one, apply site-wide, then align GBP services list, schema, and the
`servicing-mot` slug (slug change needs a 301 if the page is already
indexed — it is not yet, so decide fast while renames are free).

## 8. AEO protocol (Nigeria notes)

- Same direct-answer-first + `FAQPage`-everywhere + consistent-facts
  tactics as the generic plan.
- Monthly spot-check prompts, localized:
  - `Best auto repair shop in Abuja`
  - `How much does brake repair cost in Abuja`
  - `Toyota Corolla brake pad price Nigeria`
  - `Car AC not cooling in traffic causes`
- Run across ChatGPT, Perplexity, and Google (AI Overviews availability in
  Nigeria varies — log "not served" vs "not cited" separately).
- Corroboration sources that matter here: Google reviews, Facebook
  recommendations, Nairaland/AutoJosh-style forum mentions, local press.

## 9. Measurement

No targets until the Section 0 baseline exists. Then adopt the generic
plan's dashboard with two changes: cost-guide freshness becomes a tracked
metric (% of cost posts checked within 6 weeks), and AI-visibility logging
distinguishes "served but not cited" from "not served in NG".

## 10. Roadmap deltas vs the generic plan

- Months 1–2: **prepend** Section 0 blockers. Technical checklist is
  otherwise done in code (Section 1) — remaining work is GBP build-out,
  NAP audit, SMS review flow.
- Months 3–4: content cadence per Section 3 above; FAQ schema already
  shipped — extend to new posts only.
- Months 5–7: chamber/network equivalents (e.g. relevant Abuja business
  associations), named-author rollout, citation list (Section 6).
- Months 8–12: expand only on data — geo pages per area served, doubling
  down on best-performing content types, shop↔service interlinking.
