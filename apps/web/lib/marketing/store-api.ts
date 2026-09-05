import { apiUrl } from "@/lib/api/client";
import { mapApiProduct, type FulfillmentType, type ShopProduct } from "@/lib/marketing/shop-catalog";

export type StoreCatalogResponse = {
  items: ShopProduct[];
  nextCursor: string | null;
  categories: string[];
};

type ApiCatalogPage = {
  items: Array<{
    id: string;
    sku: string;
    name: string;
    category: string;
    description: string | null;
    price: number;
    currency: string;
    imageUrl: string | null;
    tenantCode: string;
    tenantId: string;
    availableQuantity: number;
    inStock: boolean;
  }>;
  nextCursor: string | null;
  categories: string[];
};

export type StoreCheckoutResponse = {
  orderReference: string;
  total: number;
  currency: string;
  paystackPublicKey: string;
  authorizationUrl: string;
  accessCode: string;
  paystackReference: string;
};

export type StoreOrderResponse = {
  id: string;
  reference: string;
  status: string;
  fulfillment: FulfillmentType;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  registration: string | null;
  notes: string | null;
  currency: string;
  total: number | string;
  paidAt: string | null;
  createdAt: string;
  lines: Array<{
    itemId: string;
    name: string;
    qty: number;
    unitPrice: number | string;
    lineTotal: number | string;
  }>;
};

async function publicJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "omit",
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (typeof body.message === "string") message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(", ");
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function fetchStoreCatalog(args?: {
  search?: string;
  category?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  cursor?: string;
  limit?: number;
}): Promise<StoreCatalogResponse> {
  const params = new URLSearchParams();
  if (args?.search) params.set("search", args.search);
  if (args?.category && args.category !== "All") params.set("category", args.category);
  if (args?.sort) params.set("sort", args.sort);
  if (args?.minPrice != null && Number.isFinite(args.minPrice)) {
    params.set("minPrice", String(args.minPrice));
  }
  if (args?.maxPrice != null && Number.isFinite(args.maxPrice)) {
    params.set("maxPrice", String(args.maxPrice));
  }
  if (args?.cursor) params.set("cursor", args.cursor);
  if (args?.limit) params.set("limit", String(args.limit));

  const query = params.toString();
  const page = await publicJson<ApiCatalogPage>(
    `/public/store/catalog${query ? `?${query}` : ""}`,
    { next: { revalidate: 3600, tags: ["store-catalog"] } },
  );

  return {
    items: page.items.map(mapApiProduct),
    nextCursor: page.nextCursor,
    categories: page.categories,
  };
}

export async function fetchStoreProduct(sku: string): Promise<ShopProduct | null> {
  const response = await fetch(apiUrl(`/public/store/catalog/${encodeURIComponent(sku)}`), {
    next: { revalidate: 3600, tags: ["store-catalog"] },
  });
  if (response.status === 404) return null;
  if (!response.ok) return null;
  const row = (await response.json()) as ApiCatalogPage["items"][number] | null;
  if (!row?.id) return null;
  return mapApiProduct(row);
}

export async function fetchAllStoreProductsForSitemap(maxItems = 2000): Promise<ShopProduct[]> {
  const items: ShopProduct[] = [];
  let cursor: string | null = null;

  while (items.length < maxItems) {
    const page = await fetchStoreCatalog({
      cursor: cursor ?? undefined,
      limit: 100,
    });
    items.push(...page.items);
    if (!page.nextCursor || page.items.length === 0) break;
    cursor = page.nextCursor;
  }

  return items.slice(0, maxItems);
}

export async function createStoreCheckout(body: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  registration?: string;
  fulfillment: FulfillmentType;
  notes?: string;
  lines: Array<{ itemId: string; qty: number }>;
  callbackUrl: string;
}): Promise<StoreCheckoutResponse> {
  return publicJson<StoreCheckoutResponse>("/public/store/checkout", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchStoreOrder(reference: string): Promise<StoreOrderResponse> {
  return publicJson<StoreOrderResponse>(
    `/public/store/orders/${encodeURIComponent(reference)}`,
  );
}

export async function confirmStoreOrder(reference: string): Promise<StoreOrderResponse> {
  return publicJson<StoreOrderResponse>(
    `/public/store/orders/${encodeURIComponent(reference)}/confirm`,
    { method: "POST", body: "{}" },
  );
}
