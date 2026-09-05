import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import MotocareMotion from "@/components/marketing/MotocareMotion";
import ShopProductDetail from "@/components/marketing/shop/ShopProductDetail";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteNav from "@/components/marketing/SiteNav";
import WebflowClientEffects from "@/components/marketing/WebflowClientEffects";
import { fetchStoreProduct } from "@/lib/marketing/store-api";
import { absoluteUrl, shopProductPath, SITE_NAME, siteUrl } from "@/lib/seo/site";

type ProductPageProps = {
  params: Promise<{ sku: string }>;
};

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { sku } = await params;
  const decoded = decodeURIComponent(sku);
  const product = await fetchStoreProduct(decoded);
  if (!product) {
    return { title: "Part not found", robots: { index: false, follow: false } };
  }

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
  const product = await fetchStoreProduct(decoded);
  if (!product) notFound();

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
      <main className="main main--subpage">
        <SiteNav />
        <section className="ve-shop ve-shop-page" data-qa-section="shop-product">
          <div className="container-full">
            <div className="breadcrumb-item">
              <Link href="/" className="breadcrumb-link text-black">
                Home
              </Link>
              <div className="breadcrumb-text text-black">/</div>
              <Link href="/shop" className="breadcrumb-link text-black">
                Shop
              </Link>
              <div className="breadcrumb-text text-black">/</div>
              <div className="breadcrumb-text text-gray-3">{product.name}</div>
            </div>

            <ShopProductDetail product={product} />
          </div>
        </section>
        <SiteFooter />
      </main>
    </>
  );
}
