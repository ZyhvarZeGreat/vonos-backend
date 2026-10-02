import Link from "next/link";

import { BLOG_POSTS } from "@/lib/marketing/blog-posts";

const POSTS = BLOG_POSTS.slice(0, 3);

function formatDate(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function AcademyPosts() {
  return (
    <section className="ac-section" data-qa-section="academy-posts">
      <div className="ac-container">
        <div className="ac-section-head">
          <div>
            <span className="ac-eyebrow">Resources</span>
            <h2 className="ac-title">
              Explore our
              <br />
              latest posts
            </h2>
          </div>
          <Link href="/blog" className="ac-btn ac-btn--ghost">
            View all →
          </Link>
        </div>

        <div className="ac-posts__grid">
          {POSTS.map((post) => (
            <article key={post.slug} className="ac-card ac-post">
              <div className="ac-post__media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.image} alt="" loading="lazy" />
              </div>
              <div className="ac-post__body">
                <div className="ac-post__meta">
                  {post.category} · {formatDate(post.publishedAt)}
                </div>
                <h3 className="ac-post__title">
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h3>
                <p className="ac-post__excerpt">{post.excerpt}</p>
                <Link href={`/blog/${post.slug}`} className="ac-post__link">
                  Read more →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
