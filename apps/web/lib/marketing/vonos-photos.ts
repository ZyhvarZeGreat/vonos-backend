/**
 * Curated Vonos photos from drive-download-20260923.
 * Source files live in /public/images/vonos-photos/.
 *
 * WORKSHOP = bay / training / repair atmosphere (home, academy, services).
 * STORE = parts / retail / catalogue surfaces (shop categories + product fallbacks).
 */

const P = "/images/vonos-photos" as const;

function photo(id: string) {
  return `${P}/${id}.jpg` as const;
}

/** Workshop atmosphere — home, academy, about, services. */
export const WORKSHOP_PHOTOS = [
  photo("IMG_0437"),
  photo("IMG_0472"),
  photo("IMG_0473"),
  photo("IMG_0445"),
  photo("IMG_0468"),
  photo("IMG_0483"),
  photo("IMG_0490"),
  photo("IMG_0491"),
  photo("IMG_4941"),
  photo("IMG_5728"),
  photo("IMG_4615"),
  photo("IMG_0454"),
] as const;

/** Store / parts catalogue — shop rails, browse tiles, product fallbacks. */
export const STORE_PHOTOS = [
  photo("IMG_0435"),
  photo("IMG_0438"),
  photo("IMG_0439"),
  photo("IMG_0440"),
  photo("IMG_0441"),
  photo("IMG_0442"),
  photo("IMG_0443"),
  photo("IMG_0444"),
  photo("IMG_0456"),
  photo("IMG_0460"),
  photo("IMG_3340"),
  photo("IMG_3343"),
] as const;

/** One distinct image per “Browse by Categories” tile (store set). */
export const STORE_CATEGORY_IMAGES = [
  photo("IMG_0435"),
  photo("IMG_0438"),
  photo("IMG_0439"),
  photo("IMG_0440"),
  photo("IMG_0441"),
] as const;

export function storePhotoForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return STORE_PHOTOS[hash % STORE_PHOTOS.length]!;
}

export function workshopPhotoForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return WORKSHOP_PHOTOS[hash % WORKSHOP_PHOTOS.length]!;
}

/** Home hero background carousel */
export const HOME_HERO_SLIDES = [
  photo("IMG_0437"),
  photo("IMG_0472"),
  photo("IMG_0473"),
  photo("IMG_4941"),
  photo("IMG_5728"),
  photo("IMG_0454"),
] as const;

/** Academy / About-style hero carousel */
export const ACADEMY_HERO_SLIDES = [
  photo("IMG_0445"),
  photo("IMG_0468"),
  photo("IMG_0483"),
  photo("IMG_4958"),
  photo("IMG_0490"),
] as const;

/** About page hero */
export const ABOUT_HERO_SLIDES = [
  photo("IMG_0436"),
  photo("IMG_0474"),
  photo("IMG_4940"),
  photo("IMG_4960"),
] as const;

/** Shop / ecom hero */
export const SHOP_HERO_IMAGE = photo("IMG_3340");

/** Default OG / social share */
export const SITE_OG_IMAGE = photo("IMG_0437");

/** Story / about single images */
export const ABOUT_STORY_IMAGE = photo("IMG_0491");
export const ABOUT_PEOPLE_IMAGE = photo("IMG_0490");
export const STATS_BG_IMAGE = photo("IMG_0454");
export const WHO_FOR_IMAGE = photo("IMG_0489");

/** Service cards (home + services list) — workshop */
export const SERVICE_PHOTOS = [
  photo("IMG_0437"),
  photo("IMG_0472"),
  photo("IMG_0483"),
  photo("IMG_4941"),
] as const;

/** Case study / wide feature */
export const CASE_STUDY_IMAGE = photo("IMG_3343");

/** Guarantee + footer CTA bands */
export const GUARANTEE_BG_IMAGE = photo("IMG_0476");
export const FOOTER_CTA_BG_IMAGE = photo("IMG_0474");

/** Home technician quote panel */
export const TECHNICIAN_IMAGE = photo("IMG_4615");

/** Team grid (about + academy instructors) */
export const TEAM_PHOTOS = [
  photo("IMG_4616"),
  photo("IMG_4665"),
  photo("IMG_5722"),
  photo("IMG_5741"),
] as const;

export const ACADEMY_INSTRUCTOR_PHOTOS = [
  photo("IMG_4615"),
  photo("IMG_4616"),
  photo("IMG_5728"),
] as const;

/** Blog / misc fallbacks */
export const BLOG_PHOTOS = [
  photo("IMG_0441"),
  photo("IMG_0442"),
  photo("IMG_0443"),
  photo("IMG_0444"),
  photo("IMG_0456"),
] as const;

export const SHOP_FALLBACK_IMAGE = STORE_PHOTOS[0]!;
export const SHOP_FEATURE_IMAGE = photo("IMG_3343");
