import Image from "next/image";
import Link from "next/link";

import type { CmsPostSummary } from "@vonos/types";
import { formatBlogDate } from "@/lib/marketing/blog-posts";

type ArticleCardProps = {
  post: CmsPostSummary;
};

export default function ArticleCard({ post }: ArticleCardProps) {
  const published = formatBlogDate(post.publishedAt ?? post.createdAt);

  return (
    <article className="vg-acard" data-node-id="95:433">
      <Link href={`/blog/${post.slug}`} className="vg-acard__media">
        <Image
          src={post.coverImageUrl}
          alt=""
          width={678}
          height={624}
          sizes="(max-width: 680px) 100vw, (max-width: 1180px) 50vw, 33vw"
        />
      </Link>
      <div className="vg-acard__text">
        <p className="vg-acard__meta">
          {post.category}
          <span className="vg-dot" aria-hidden />
          {published}
        </p>
        <h3 className="vg-acard__title">
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
      </div>
      <Link href={`/blog/${post.slug}`} className="vg-acard__read">
        Read Articles →
      </Link>
    </article>
  );
}
