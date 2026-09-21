import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import ProductDetailView from "@/components/marketing/ecommerce/ProductDetailView";
import SimilarProducts from "@/components/marketing/ecommerce/SimilarProducts";
import MotocareMotion from "@/components/marketing/MotocareMotion";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteNav from "@/components/marketing/SiteNav";
import WebflowClientEffects from "@/components/marketing/WebflowClientEffects";
import { fetchStoreProduct } from "@/lib/marketing/store-api";
import { absoluteUrl, shopProductPath, SITE_NAME, siteUrl } from "@/lib/seo/site";
import type { ShopProduct } from "@/lib/marketing/shop-catalog";

type ProductPageProps = {
  params: Promise<{ sku: string }>;
};

type ProductLoadResult =
  | { status: "ok"; product: ShopProduct }
  | { status: "not_found" }
  | { status: "unavailable" };

async function loadProduct(sku: string): Promise<ProductLoadResult> {
  try {
    const product = await fetchStoreProduct(sku);
    return product ? { status: "ok", product } : { status: "not_found" };
  } catch {
    return { status: "unavailable" };
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { sku } = await params;
  const decoded = decodeURIComponent(sku);
  const result = await loadProduct(decoded);
  if (result.status !== "ok") {
    return {
      title: result.status === "unavailable" ? "Shop temporarily unavailable" : "Part not found",
      robots: { index: false, follow: false },
    };
  }

  const product = result.product;
  const path = shopProductPath(product.sku ?? decoded);
  const description =
    product.description ||
    `Buy ${product.name} from ${SITE_NAME}. Genuine auto parts with delivery or workshop fitment.`;
  const image = product.icon.startsWith("http") ? product.icon : absoluteUrl(product.icon);

  return {
    title: product.name,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${product.name} | ${SITE_NAME}`,
      description,
      url: absoluteUrl(path),
      type: "website",
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | ${SITE_NAME}`,
      description,
      images: [image],
    },
  };
}

export default async function ShopProductPage({ params }: ProductPageProps) {
  const { sku } = await params;
  const decoded = decodeURIComponent(sku);
  const result = await loadProduct(decoded);

  if (result.status === "unavailable") {
    return (
      <>
        <MotocareMotion />
        <WebflowClientEffects />
        <main className="main main--subpage vg-page">
          <SiteNav />
          <section className="vg-pdp" data-qa-section="shop-product-unavailable">
            <div className="vg-container">
              <nav className="vg-crumbs" aria-label="Breadcrumb">
                <Link href="/">Home</Link>
                <span aria-hidden>/</span>
                <Link href="/shop">Shop</Link>
              </nav>
              <div className="vg-error" role="alert">
                <p>We can’t reach the database right now — please try again in a moment.</p>
                <Link href={`/shop/${encodeURIComponent(decoded)}`} className="vg-btn">
                  Try again
                </Link>
                <Link href="/shop" className="vg-textlink">
                  Back to shop
                </Link>
              </div>
            </div>
          </section>
          <SiteFooter />
        </main>
      </>
    );
  }

  if (result.status === "not_found") notFound();
  const product = result.product;

  const path = shopProductPath(product.sku ?? decoded);
  const image = product.icon.startsWith("http") ? product.icon : absoluteUrl(product.icon);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    image,
    brand: { "@type": "Brand", name: SITE_NAME },
    category: product.category,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(path),
      priceCurrency: "NGN",
      price: product.price,
      availability:
        product.inStock === false
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      seller: { "@type": "Organization", name: SITE_NAME, url: siteUrl() },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MotocareMotion />
      <WebflowClientEffects />
      <main className="main main--subpage vg-page">
        <SiteNav />
        <section className="vg-pdp" data-qa-section="shop-product">
          <div className="vg-container">
            <nav className="vg-crumbs" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <span aria-hidden>/</span>
              <Link href="/shop">Shop</Link>
              <span aria-hidden>/</span>
              <span className="vg-crumbs__current">{product.name}</span>
            </nav>

            <ProductDetailView product={product} />
          </div>
        </section>
        <SimilarProducts product={product} />
        <SiteFooter />
      </main>
    </>
  );
}
