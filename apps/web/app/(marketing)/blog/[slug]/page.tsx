import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ArticleView from "@/components/marketing/ecommerce/ArticleView";
import MotocareMotion from "@/components/marketing/MotocareMotion";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteNav from "@/components/marketing/SiteNav";
import WebflowClientEffects from "@/components/marketing/WebflowClientEffects";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  jsonLdScript,
} from "@/lib/seo/schema";
import {
  fetchAllPublicCmsSlugs,
  fetchPublicCmsPost,
  fetchPublicCmsPosts,
} from "@/lib/marketing/cms-api";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await fetchAllPublicCmsSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPublicCmsPost(slug);
  if (!post) return { title: "Article not found | Vonos" };

  return {
    title: `${post.title} | Vonos Blog`,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await fetchPublicCmsPost(slug);
  if (!post) notFound();

  const catalog = await fetchPublicCmsPosts(12).catch(() => ({ items: [] }));
  const related = catalog.items.filter((item) => item.slug !== post.slug).slice(0, 3);
  const path = `/blog/${post.slug}`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            articleJsonLd({
              headline: post.title,
              description: post.excerpt,
              path,
              image: post.coverImageUrl,
              datePublished: post.publishedAt ?? post.createdAt,
              dateModified: post.updatedAt ?? post.createdAt,
              authorName: post.author,
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Blog", path: "/blog" },
              { name: post.title, path },
            ]),
          ),
        }}
      />
      <MotocareMotion />
      <WebflowClientEffects />
      <main className="main main--subpage vg-page">
        <SiteNav />
        <ArticleView post={post} related={related} />
        <SiteFooter showCta={false} />
      </main>
    </>
  );
}
