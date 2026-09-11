import Image from "next/image";
import Link from "next/link";

import {
  formatBlogDate,
  type BlogPost,
} from "@/lib/marketing/blog-posts";

const scrollItem = { "scroll-item": "" } as const;

type BlogCardProps = {
  post: BlogPost;
  variant?: "grid" | "featured";
};

export default function BlogCard({ post, variant = "grid" }: BlogCardProps) {
  return (
    <article
      className={`vonos-blog-card${variant === "featured" ? " vonos-blog-card--featured" : ""}`}
      {...scrollItem}
    >
      <Link href={`/blog/${post.slug}`} className="vonos-blog-card-link">
        <div className="vonos-blog-card-image-wrap">
          <Image
            src={post.image}
            alt=""
            width={640}
            height={360}
            className="vonos-blog-card-image"
            sizes="(max-width: 767px) 100vw, (max-width: 991px) 50vw, 33vw"
          />
        </div>
        <div className="vonos-blog-card-body">
          <div className="vonos-blog-card-meta">
            <span className="vonos-blog-card-category">{post.category}</span>
            <span className="vonos-blog-card-date">
              {formatBlogDate(post.publishedAt)}
            </span>
          </div>
          <h3 className="vonos-blog-card-title">{post.title}</h3>
          <p className="vonos-blog-card-excerpt">{post.excerpt}</p>
          <span className="vonos-blog-card-read">
            {post.readMinutes} min read
          </span>
        </div>
      </Link>
    </article>
  );
}
