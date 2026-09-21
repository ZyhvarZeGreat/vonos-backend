import type { CmsPost, CmsPostSummary } from "@vonos/types";
import Image from "next/image";

import ArticleCard from "@/components/marketing/ecommerce/ArticleCard";
import SectionHead from "@/components/marketing/ecommerce/SectionHead";
import { formatBlogDate } from "@/lib/marketing/blog-posts";

type ArticleViewProps = {
  post: CmsPost;
  related?: CmsPostSummary[];
};

export default function ArticleView({ post, related = [] }: ArticleViewProps) {
  const published = formatBlogDate(post.publishedAt ?? post.createdAt);
  const sections = [...post.sections].sort((a, b) => a.sortOrder - b.sortOrder);
  const [firstSection, ...restSections] = sections;

  return (
    <>
      <article className="vg-article" data-node-id="98:659" data-qa-section="blog-article">
        <div className="vg-container">
          <header className="vg-article__head">
            <h1 className="vg-article__title">{post.title}</h1>
            <p className="vg-article__meta">
              {post.category}
              <span className="vg-dot" aria-hidden />
              {published}
            </p>
          </header>

          <div className="vg-article__hero">
            <Image
              src={post.coverImageUrl}
              alt=""
              width={1200}
              height={600}
              priority
              sizes="(max-width: 1180px) 100vw, 1200px"
            />
          </div>

          <div className="vg-article__body">
            <p className="vg-article__lead">{post.intro}</p>

            {firstSection ? (
              <section className="vg-article__section">
                <h2 className="vg-article__h2">{firstSection.title}</h2>
                {firstSection.paragraphs.map((paragraph, index) => (
                  <p key={index} className="vg-article__p">
                    {paragraph}
                  </p>
                ))}
              </section>
            ) : null}

            {post.excerpt ? <p className="vg-article__quote">{post.excerpt}</p> : null}

            {restSections.map((section) => (
              <section key={section.sectionId} className="vg-article__section">
                <h2 className="vg-article__h2">{section.title}</h2>
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index} className="vg-article__p">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </div>
      </article>

      {related.length > 0 ? (
        <section className="vg-sec" data-node-id="105:933" data-qa-section="blog-related">
          <div className="vg-container">
            <SectionHead title="Similar Articles" viewAllHref="/blog" />
            <div className="vg-articles">
              {related.slice(0, 3).map((item) => (
                <ArticleCard key={item.id} post={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
