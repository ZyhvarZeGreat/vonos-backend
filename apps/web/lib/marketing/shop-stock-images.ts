/**
 * Category-appropriate packshots for the storefront.
 * Used when a catalogue line has no product photo, and for Browse-by-Category tiles.
 */

export type ShopStockKind =
  | "oil"
  | "brake"
  | "filter"
  | "battery"
  | "tyre"
  | "suspension"
  | "electrical"
  | "interior"
  | "body"
  | "generic";

const STOCK: Record<ShopStockKind, string> = {
  oil: "/images/shop/stock/oil.jpg",
  brake: "/images/shop/stock/brake.jpg",
  filter: "/images/shop/stock/filter.jpg",
  battery: "/images/shop/stock/battery.jpg",
  tyre: "/images/shop/stock/tyre.jpg",
  suspension: "/images/shop/stock/suspension.jpg",
  electrical: "/images/shop/stock/electrical.jpg",
  interior: "/images/shop/stock/interior.jpg",
  body: "/images/shop/stock/body.jpg",
  generic: "/images/shop/stock/generic.jpg",
};

const RULES: Array<{ kind: ShopStockKind; test: RegExp }> = [
  {
    kind: "oil",
    test: /\b(oil|lube|lubricant|grease|atf|coolant|fluid|gear\s*oil|engine\s*oil|motor\s*oil)\b/i,
  },
  {
    kind: "brake",
    test: /\b(brake|pad|disc|rotor|caliper|shoe|abs\s*sensor)\b/i,
  },
  {
    kind: "filter",
    test: /\b(filter|filtr|air\s*filter|oil\s*filter|fuel\s*filter|cabin\s*filter|pollen)\b/i,
  },
  {
    kind: "battery",
    test: /\b(batter(?:y|ies)|accumulator|power\s*pack)\b/i,
  },
  {
    kind: "tyre",
    test: /\b(tyre|tire|wheel|rim|alloy)\b/i,
  },
  {
    kind: "suspension",
    test: /\b(suspension|shock|strut|spring|arm|bushing|ball\s*joint|tie\s*rod|steer)\b/i,
  },
  {
    kind: "electrical",
    test: /\b(electric|sensor|plug|coil|alternator|starter|relay|fuse|wiring|ecu|ignition|bulb|lamp|led)\b/i,
  },
  {
    kind: "interior",
    test: /\b(interior|cabin|mat|seat|dash|trim|wiper|mirror\s*glass)\b/i,
  },
  {
    kind: "body",
    test: /\b(body|bumper|panel|fender|bonnet|hood|door|grill|mirror|light\s*cover)\b/i,
  },
];

export function resolveShopStockKind(...parts: Array<string | null | undefined>): ShopStockKind {
  const haystack = parts.filter(Boolean).join(" ");
  for (const rule of RULES) {
    if (rule.test.test(haystack)) return rule.kind;
  }
  return "generic";
}

export function shopStockImage(...parts: Array<string | null | undefined>): string {
  return STOCK[resolveShopStockKind(...parts)];
}

export function shopStockImageForKind(kind: ShopStockKind): string {
  return STOCK[kind];
}

/** True when the product icon is missing or a generic placeholder glyph. */
export function isShopPlaceholderIcon(src: string | null | undefined): boolean {
  if (!src) return true;
  if (src.startsWith("/images/icons/")) return true;
  if (src.includes("service-0")) return true;
  if (src.includes("/images/vonos-photos/")) return true;
  return false;
}

/**
 * Prefer the real catalogue photo; otherwise a packshot that matches the stock type.
 */
export function resolveShopProductImage(args: {
  imageUrl?: string | null;
  name: string;
  category?: string | null;
  sku?: string | null;
}): string {
  if (args.imageUrl && !isShopPlaceholderIcon(args.imageUrl)) {
    return args.imageUrl;
  }
  return shopStockImage(args.name, args.category, args.sku);
}

/** Browse tiles — fixed kind per tile so oil ≠ brakes ≠ suspension. */
export const BROWSE_STOCK_IMAGES = {
  interior: STOCK.interior,
  brake: STOCK.brake,
  body: STOCK.body,
  suspension: STOCK.suspension,
  electrical: STOCK.electrical,
  oil: STOCK.oil,
  filter: STOCK.filter,
  battery: STOCK.battery,
  tyre: STOCK.tyre,
} as const;
