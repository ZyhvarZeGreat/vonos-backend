import Link from "next/link";

import BlogCard from "@/components/marketing/pages/blog/BlogCard";
import { fetchLatestPublicCmsPosts } from "@/lib/marketing/cms-api";

export default async function BlogSection() {
  const posts = await fetchLatestPublicCmsPosts(3);

  return (
    <section
      data-scroll="load"
      className="section-spacing-bottom vonos-blog-section"
      data-qa-section="blog-preview"
    >
      <div className="container">
        <div className="section-title">
          <div className="vonos-blog-section-header">
            <div scroll-item="">
              <div className="pre-title w-variant-7e8276b8-3fa3-b83e-411c-2eeab6ce4110">
                From the workshop
              </div>
              <h2 className="no-margin-bottom">
                Tips, guides, and honest car advice.
              </h2>
            </div>
            <div scroll-item="">
              <Link href="/blog" className="button-primary w-inline-block">
                <div className="button-title">View all articles</div>
                <div className="button-hover-bg" />
              </Link>
            </div>
          </div>
        </div>
        <div className="vonos-blog-grid">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
