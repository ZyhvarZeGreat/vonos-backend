import type { CmsPost, CmsPostListPage, CmsPostSummary } from "@vonos/types";
import { apiUrl } from "@/lib/api/client";
import { BLOG_POSTS, type BlogPost } from "@/lib/marketing/blog-posts";

async function publicJson<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path), {
    credentials: "omit",
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });
  if (!response.ok) {
    throw new Error(`CMS request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function fallbackSummary(post: BlogPost): CmsPostSummary {
  return {
    id: post.slug,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category: post.category,
    coverImageUrl: post.image,
    author: post.author,
    status: "published",
    publishedAt: post.publishedAt,
    readMinutes: post.readMinutes,
    createdAt: post.publishedAt,
    updatedAt: post.publishedAt,
  };
}

function fallbackPost(post: BlogPost): CmsPost {
  return {
    ...fallbackSummary(post),
    scopeKey: "group",
    tenantId: null,
    intro: post.intro,
    sortOrder: 0,
    sections: post.sections.map((section, index) => ({
      sectionId: section.id,
      sortOrder: index,
      title: section.title,
      paragraphs: section.paragraphs,
    })),
  };
}

export async function fetchPublicCmsPosts(limit = 20): Promise<CmsPostListPage> {
  try {
    return await publicJson<CmsPostListPage>(
      `/public/cms/posts?limit=${limit}`,
    );
  } catch {
    const items = [...BLOG_POSTS]
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      )
      .slice(0, limit)
      .map(fallbackSummary);
    return { items, nextCursor: null };
  }
}

export async function fetchPublicCmsPost(slug: string): Promise<CmsPost | null> {
  try {
    return await publicJson<CmsPost>(`/public/cms/posts/${encodeURIComponent(slug)}`);
  } catch {
    const post = BLOG_POSTS.find((row) => row.slug === slug);
    return post ? fallbackPost(post) : null;
  }
}

export async function fetchLatestPublicCmsPosts(limit = 3): Promise<CmsPostSummary[]> {
  const page = await fetchPublicCmsPosts(limit);
  return page.items;
}

export async function fetchAllPublicCmsSlugs(): Promise<string[]> {
  try {
    const slugs: string[] = [];
    let cursor: string | null = null;
    do {
      const qs = new URLSearchParams({ limit: "50" });
      if (cursor) qs.set("cursor", cursor);
      const page = await publicJson<CmsPostListPage>(`/public/cms/posts?${qs}`);
      slugs.push(...page.items.map((item) => item.slug));
      cursor = page.nextCursor;
    } while (cursor);
    return slugs;
  } catch {
    return BLOG_POSTS.map((post) => post.slug);
  }
}
