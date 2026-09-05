# Handover — Vonos customer marketing site (Phase 1 front door)

**Last updated:** 3 September 2026  
**Source prototype:** `Bosco-Projects/windsurf-project/motocare-app` (archive)  
**Target:** `/Users/theaesirdev/Vonos/apps/web`  
**Status:** Marketing site wired as apex `/`. Ops ERP routes unchanged.

---

## How to run

From monorepo root `/Users/theaesirdev/Vonos`:

```bash
./scripts/dev.sh
# → web http://localhost:3000
# → api  http://localhost:3001
```

Starts Postgres via Docker if needed, then `npm run dev` (web + API).

Alt:

```bash
npm install
npm run build --workspace=@vonos/types
npm run dev --workspace=web
```

**Marketing deps:** `gsap`, `lenis` (in `apps/web`).

---

## What landed (initial Phase 1)

The Motocare → Vonos rebrand (public website + parts shop flow) is the **root landing experience** of the Vonos Next app.

| Area | Location |
|------|----------|
| Marketing routes | `apps/web/app/(marketing)/…` |
| Marketing UI | `apps/web/components/marketing/…` |
| Shop cart + catalog | `apps/web/components/marketing/shop/`, `apps/web/lib/marketing/` |
| Public assets | `apps/web/public/images/`, `apps/web/public/styles/` |
| Marketing CSS extras | `apps/web/styles/marketing.css` |
| Theme overrides | `apps/web/public/styles/vonos-theme.css` |
| Scraped Webflow CSS | `apps/web/public/styles/motocare-scraped.css` |
| CardNav | `components/marketing/CardNav.tsx`, `CardNav.css` |
| SEO helpers | `lib/seo/site.ts`, `app/sitemap.ts`, `app/robots.ts` |

Former apex maintenance UI lives at **`/maintenance`**.  
`vercel.json` no longer rewrites `/` → maintenance HTML.

---

## Session updates — 3 September 2026

Work since the original 2 Sep handover. Prefer continuing **in Vonos**, not Motocare.

### Navigation — CardNav

Replaced the scraped Webflow nav with **CardNav** (via `SiteNav.tsx`).

| Behaviour | Detail |
|-----------|--------|
| Idle (desktop, fine pointer) | Narrower pill (~50% width); height stays **60px** |
| Hover bar | GSAP expands width (`power3.out` ~0.48s) — same ease family as menu open |
| Click hamburger | Grows nav to **~260px**, then cards fade in |
| Close | Overlay `.card-nav-backdrop` clears **immediately** (`isExpanded` not stuck) |
| Compact layout | Flex row: hamburger \| logo \| cart (not absolute-centred logo) |
| Link hover | Opacity only — **no** grey hover background |
| CTA | Hidden until nav is wide |

**Files:** `CardNav.tsx`, `CardNav.css`, overrides in `styles/marketing.css`, wrapper `SiteNav.tsx`.

### Cart UX

- Removed floating bottom basket bar.
- Add-to-cart: **shake** the nav pill + short **toast** (“… added to basket”).
- Cart badge on the nav cart icon.
- Event: `CART_ADDED_EVENT` from `stores/shopCartStore.ts`.

### Track vehicle

- Lookup is **name + registration plate only**.
- Booking reference requirement **removed**.
- Copy updated accordingly in `TrackVehiclePanel.tsx`.
- Still demo timeline (not live ERP) — see backlog.

### Shop / checkout

- Default fulfillment: **delivery**.
- Workshop / in-shop pickup removed from the customer path (customers mostly want delivery).
- Paystack + public catalog still as previously scaffolded (see Ecommerce section below).

### FAQ accordions

- GSAP height/opacity + plus-icon rotation on open/close.
- Implemented in `WebflowClientEffects.tsx` (targets `.faqs-right` / `.accordion-*`).

### Footer

- Footer CTA is **static** (`FooterCtaScrollExpand` — ScrollExpand removed earlier; tall image band).
- Blue band uses `#1e3a8a` (`vonos-footer-blue-band`).
- Big **Vonos** wordmark ticker at bottom of footer (`MarketingFooter.tsx` → `.footer-marquee-list`).

### Marquees / text loops

- **Removed** experimental `CurvedLoop` / `TextLoop` components (user request).
- Homepage ticker under hero restored to scraped CSS marquee (`MarqueeSection.tsx` + `/images/ui/ticker-sep.svg`).
- Footer Vonos marquee was **not animating** because scrape CSS had a global kill-all rule:

  ```css
  /* was unconditional in motocare-scraped.css — broke every CSS animation */
  *, ::before, ::after { animation: none !important; }
  ```

  That rule is now wrapped in `@media (prefers-reduced-motion: reduce)` only.
- Marquee animation also reinforced in `styles/marketing.css` (`motocare-marquee`, footer ~18s).
- Footer marquee container no longer uses `scroll-item` (was stuck at opacity 0 until reveal).

### SEO (started — incomplete)

| Done | Notes |
|------|--------|
| `lib/seo/site.ts` | Site constants / helpers |
| `app/robots.ts` | Robots |
| `app/sitemap.ts` | Sitemap |
| Product route metadata | Partial |

**Still open:** product cards not all linking through SEO-friendly paths; page metadata coverage incomplete. Continue from `lib/seo/site.ts` and shop product routes.

### Layout polish

- Marketing subpages should share homepage top padding so the CardNav doesn’t cover content.
- Footer image CTA height increased earlier (`clamp` taller band).

---

## Public routes (customer)

| Path | Purpose |
|------|---------|
| `/` | Homepage (hero, services, reviews, FAQ, …) |
| `/about` | About |
| `/services` | Services list |
| `/contact` | Booking / contact form (static for now) |
| `/track` | Track my vehicle — **name + plate** (demo) |
| `/shop` | Parts catalog + basket |
| `/shop/checkout` | Customer details + **delivery**-focused fulfillment |
| `/shop/confirmation` | Order confirmation (`?ref=VON-xxxxx`) |

Ops / ERP routes still work as before, e.g.:

- `/login`, `/VW/overview`, `/VA/…`, `/operations/…`, `/admin/…`

---

## Architecture notes

1. **Route group `(marketing)`** — own layout loads Motocare CSS + Archivo. Cart state uses `stores/shopCartStore.ts` (Zustand + localStorage). Does **not** replace the root ERP layout (`AppProviders`, Query, Helvetica).
2. **`MarketingShell`** — client wrapper that adds Webflow/Lenis `html`/`body` classes only while on marketing pages.
3. **`MotocareMotion`** — Lenis + ScrollTrigger reveals; **skips** marquee nodes so GSAP doesn’t fight CSS tickers.
4. **Shop cart** — Zustand + `localStorage` (`vonos-shop-cart`). Orders / last order still session-oriented; Paystack when keys present.
5. **Currency** — Naira via `formatShopPrice()` (`en-NG` / `NGN`) in `lib/marketing/shop-catalog.ts`.
6. **Images** — Vonos custom `vonosImageLoader` (basePath-aware). Marketing assets under `/images/…`.

---

## Brand tokens (current)

Defined mainly in `public/styles/vonos-theme.css`:

- Page blue: `#eff6ff`
- Accent blue: `#2563eb` / dark `#1e3a8a`
- Buttons: red `#dc2626`, white text
- Text on blue panels: `#e2e8f0`

---

## Intentionally unfinished (Phase 1 backlog)

1. **Book / contact form** → create lead/job in Nest API (today: static Webflow form HTML).
2. **Track my job** → real job stages from ERP (today: demo timeline; name + plate criteria ready for API).
3. **Shop checkout → live catalog** — wired to `GET /public/store/catalog` (VSP) and Paystack via `POST /public/store/checkout`. Set `PAYSTACK_SECRET_KEY` + `PAYSTACK_PUBLIC_KEY` on the API before live charges work.
4. **Abuja/local copy** — phone, address, hours still partly Motocare/US placeholders in scraped HTML.
5. **Ops basePath=`/operations`** deploy — confirm marketing is only on apex deployment (no basePath), not the ops Vercel project.
6. **Brown/cream bleed** — if any cream sections remain, strengthen overrides in `vonos-theme.css` (`--color--gray-5/6/7`).
7. **SEO finish** — product card links, remaining metadata, structured data as needed.
8. **CardNav mobile polish** — verify touch / coarse-pointer path (compact vs expand) on real devices.

### Ecommerce + Paystack (backend scaffolded)

| Endpoint | Purpose |
|----------|---------|
| `GET /public/store/catalog` | Retail items from **VSP only** (`availableForRetail`, sell price set) |
| `GET /public/store/catalog/:sku` | Single SKU (prefers VSP if duplicate) |
| `POST /public/store/checkout` | Create `StoreOrder` + Paystack initialize → `authorizationUrl` |
| `GET /public/store/orders/:reference` | Order status / lines |
| `POST /public/store/orders/:reference/confirm` | Verify Paystack after browser return |
| `POST /public/store/webhooks/paystack` | Signed webhook → mark paid + create ERP `Sale` per tenant |

**Env (API):** `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY`

**Paystack setup (required for payment redirect):**
1. Create/open [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developers) → **Test** keys for sandbox.
2. Put keys in `apps/api/.env`:
   ```
   PAYSTACK_PUBLIC_KEY=pk_test_...
   PAYSTACK_SECRET_KEY=sk_test_...
   ```
3. Webhook URL (Dashboard → Settings → API Keys & Webhooks):  
   `https://<your-api-host>/public/store/webhooks/paystack`
4. Restart `api:dev` after saving keys.
5. Without keys, checkout returns an error: *Paystack is not configured*.

Shop UI flow: `/shop` → basket → `/shop/checkout` → Paystack hosted page → `/shop/confirmation?ref=VON-…` (calls confirm).

```bash
cd apps/api
npx prisma migrate dev --name store_orders_paystack
```

**Catalog rule:** items must have `availableForRetail: true` and a `sellPrice` on **VSP** (marketplace). VISP is not exposed on the public shop.

**Auth note:** marketing paths (`/about`, `/services`, `/shop`, `/track`, `/contact`, `/`) are public in `AuthGuard` — do not remove those prefixes or nav will bounce to `/login`.

Reference proposal: `docs/VONOS_PHASE1_CUSTOMER_PLATFORM_PROPOSAL.md`.

---

## Files to touch first when extending

| Task | Start here |
|------|------------|
| Nav / CardNav | `components/marketing/CardNav.tsx`, `CardNav.css`, `SiteNav.tsx` |
| Footer / Vonos ticker | `components/marketing/MarketingFooter.tsx`, `styles/marketing.css` |
| FAQ accordion motion | `components/marketing/WebflowClientEffects.tsx` |
| Homepage ticker | `components/marketing/MarqueeSection.tsx` |
| Shop products / prices | `lib/marketing/shop-catalog.ts` |
| Checkout → API | `components/marketing/pages/shop/CheckoutPanel.tsx` |
| Track → API | `components/marketing/pages/track/TrackVehiclePanel.tsx` |
| Theme / button colors | `public/styles/vonos-theme.css` |
| Scrape CSS pitfalls | `public/styles/motocare-scraped.css` (end of file — motion kill rule) |
| SEO | `lib/seo/site.ts`, `app/sitemap.ts`, `app/robots.ts` |
| Homepage section order | `app/(marketing)/page.tsx` |

---

## Do not

- Do **not** run Motocare `prepare:from-standalone` against this tree — that script lives only in the prototype and would overwrite hand edits.
- Do **not** put Motocare scraped CSS into the global ERP `styles/globals.css` — keep it marketing-scoped via `(marketing)/layout.tsx`.
- Do **not** restore the Vercel `/` → `maintenance.html` rewrite unless intentionally taking the public site offline.
- Do **not** reintroduce an unconditional `* { animation: none !important }` in scraped CSS — it kills marquees, FAQ, and CardNav CSS transitions.
- Do **not** re-add CurvedLoop / TextLoop unless product explicitly wants curved SVG tickers again.

---

## Quick smoke checklist

- [ ] `/` renders Vonos homepage (not maintenance)
- [ ] CardNav: idle narrow → hover expands width → hamburger opens cards; overlay clears on close
- [ ] Nav links: Home, Services, Shop, About, Track, Contact (via card groups)
- [ ] `/shop` → add to basket → badge + **nav shake** + **toast** (no floating bottom bar)
- [ ] Checkout defaults to **delivery** (no workshop pickup)
- [ ] Prices show as ₦…
- [ ] `/track` accepts **name + plate** only (no booking ref)
- [ ] FAQ accordion opens/closes with height animation
- [ ] Footer blue band: **Vonos** text marquee scrolls
- [ ] Hero strip ticker scrolls (warranty / reviews copy)
- [ ] `/login` and `/VW/overview` still load
- [ ] `/maintenance` still shows old maintenance landing

---

## Prototype leftover

`Bosco-Projects/windsurf-project/motocare-app` remains the earlier sandbox. Prefer continuing work **in Vonos** from this point; treat Motocare as archive unless you need to re-export assets.
