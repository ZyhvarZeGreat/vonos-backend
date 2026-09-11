import type { Metadata } from "next";
import { notFound } from "next/navigation";

import MotocareMotion from "@/components/marketing/MotocareMotion";
import BlogPostArticle from "@/components/marketing/pages/blog/BlogPostArticle";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteNav from "@/components/marketing/SiteNav";
import WebflowClientEffects from "@/components/marketing/WebflowClientEffects";
import { BLOG_POSTS, getBlogPost } from "@/lib/marketing/blog-posts";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Article not found | Vonos" };

  return {
    title: `${post.title} | Vonos Blog`,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  return (
    <>
      <MotocareMotion />
      <WebflowClientEffects />
      <main className="main main--subpage">
        <SiteNav />
        <BlogPostArticle post={post} />
        <SiteFooter showCta={false} />
      </main>
    </>
  );
}
