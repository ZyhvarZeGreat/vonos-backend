export type ShopProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  icon: string;
  sku?: string;
  inStock?: boolean;
  availableQuantity?: number;
};

export type CartLine = {
  productId: string;
  qty: number;
  /** Snapshot at add-to-cart time so basket works without reloading catalog. */
  product: ShopProduct;
};

export type FulfillmentType = "collection" | "fitment" | "delivery";

export type ShopOrder = {
  reference: string;
  createdAt: string;
  status?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    registration: string;
  };
  fulfillment: FulfillmentType;
  notes: string;
  lines: Array<{ productId: string; name: string; qty: number; unitPrice: number }>;
  total: number;
  paid?: boolean;
};

/** Fallback only if API returns no categories — prefer live VSP names. */
export const SHOP_CATEGORIES_FALLBACK = [
  "All",
  "Oils",
  "Lubricants",
  "Filters",
  "BRAKE PAD",
  "Suspensions",
  "Electrical",
  "Sensors",
] as const;

export function formatShopPrice(value: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Soften ALL-CAPS catalog labels without forcing title case. */
export function formatShopLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const letters = trimmed.replace(/[^A-Za-z]/g, "");
  if (letters.length > 2 && letters === letters.toUpperCase()) {
    const lower = trimmed.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  return trimmed;
}

export function cartLineSubtotal(line: CartLine): number {
  return line.product.price * line.qty;
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + cartLineSubtotal(line), 0);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.qty, 0);
}

export const SHOP_CART_STORAGE_KEY = "vonos-shop-cart-v2";
const ORDER_STORAGE_KEY = "vonos-shop-last-order";

export function saveOrderToStorage(order: ShopOrder): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
}

export function loadOrderFromStorage(reference: string): ShopOrder | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ORDER_STORAGE_KEY);
    if (!raw) return null;
    const order = JSON.parse(raw) as ShopOrder;
    return order.reference === reference ? order : null;
  } catch {
    return null;
  }
}

export function mapApiProduct(row: {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  inStock: boolean;
  availableQuantity: number;
}): ShopProduct {
  return {
    id: row.id,
    name: row.name,
    category: row.category || "General",
    price: row.price,
    description: row.description?.trim() || "Genuine auto part from the Vonos SP marketplace.",
    icon: row.imageUrl || "/images/icons/service-01.svg",
    sku: row.sku,
    inStock: row.inStock,
    availableQuantity: row.availableQuantity,
  };
}
