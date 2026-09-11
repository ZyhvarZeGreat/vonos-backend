import BlogCard from "@/components/marketing/pages/blog/BlogCard";
import { BLOG_POSTS } from "@/lib/marketing/blog-posts";

export default function BlogPageList() {
  const posts = [...BLOG_POSTS].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  return (
    <section data-scroll="load" className="section-spacing-bottom">
      <div className="container">
        <div className="vonos-blog-grid vonos-blog-grid--page">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
