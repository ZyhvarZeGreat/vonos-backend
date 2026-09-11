import Image from "next/image";
import Link from "next/link";

import {
  formatBlogDate,
  type BlogPost,
} from "@/lib/marketing/blog-posts";

type BlogPostArticleProps = {
  post: BlogPost;
};

export default function BlogPostArticle({ post }: BlogPostArticleProps) {
  return (
    <>
      <section className="hero-section vonos-blog-post-hero">
        <div className="container">
          <div data-show="show" className="breadcrumb-item">
            <Link href="/" className="breadcrumb-link text-black">
              Home
            </Link>
            <div className="breadcrumb-text text-gray-3">/</div>
            <Link href="/blog" className="breadcrumb-link text-black">
              Blog
            </Link>
            <div className="breadcrumb-text text-gray-3">/</div>
            <div className="breadcrumb-text text-gray-3">{post.category}</div>
          </div>
          <div className="vonos-blog-post-header" data-show="show">
            <div className="vonos-blog-post-meta">
              <span className="vonos-blog-card-category">{post.category}</span>
              <span>{formatBlogDate(post.publishedAt)}</span>
              <span>{post.readMinutes} min read</span>
            </div>
            <h1 className="no-margin-bottom">{post.title}</h1>
            <p className="vonos-blog-post-excerpt">{post.excerpt}</p>
            <p className="vonos-blog-post-byline">By {post.author}</p>
          </div>
        </div>
      </section>

      <section data-scroll="load" className="section-spacing-bottom">
        <div className="container">
          <article className="vonos-blog-article">
            <div className="vonos-blog-article-image-wrap">
              <Image
                src={post.image}
                alt=""
                width={1200}
                height={675}
                className="vonos-blog-article-image"
                priority
                sizes="(max-width: 991px) 100vw, 960px"
              />
            </div>

            <nav className="vonos-blog-toc" aria-label="Article sections">
              <p className="vonos-blog-toc-label">In this article</p>
              <ol className="vonos-blog-toc-list">
                {post.sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="vonos-blog-toc-link">
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="vonos-blog-article-body">
              <div className="vonos-blog-intro">
                {post.intro.map((paragraph) => (
                  <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                ))}
              </div>

              {post.sections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="vonos-blog-section"
                >
                  <h2 className="vonos-blog-section-title">{section.title}</h2>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                  ))}
                </section>
              ))}
            </div>

            <div className="vonos-blog-article-footer">
              <Link href="/blog" className="button-primary w-inline-block">
                <div className="button-title">Back to blog</div>
                <div className="button-hover-bg" />
              </Link>
              <Link href="/contact" className="button-primary w-inline-block">
                <div className="button-title">Book your car in</div>
                <div className="button-hover-bg" />
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
