import type { CmsPostSummary } from "@vonos/types";
import BlogCard from "@/components/marketing/pages/blog/BlogCard";

type BlogPageListProps = {
  posts: CmsPostSummary[];
};

export default function BlogPageList({ posts }: BlogPageListProps) {
  return (
    <section data-scroll="load" className="section-spacing-bottom">
      <div className="container">
        <div className="vonos-blog-grid vonos-blog-grid--page">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
