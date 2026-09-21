"use client";

import type { CmsPostSummary } from "@vonos/types";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";

import ArticleCard from "@/components/marketing/ecommerce/ArticleCard";
import SectionHead from "@/components/marketing/ecommerce/SectionHead";

const PAGE_SIZE = 6;

type BlogIndexProps = {
  posts: CmsPostSummary[];
};

export default function BlogIndex({ posts }: BlogIndexProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const visible = posts.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <section className="vg-sec" data-node-id="95:396" data-qa-section="blog-list">
      <div className="vg-container">
        <SectionHead title="News & Articles" />

        {visible.length === 0 ? (
          <p className="vg-empty">No articles published yet. Check back soon.</p>
        ) : (
          <div className="vg-articles">
            {visible.map((post) => (
              <ArticleCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <nav className="vg-pager vg-pager--end" aria-label="Article pages">
            <button
              type="button"
              className="vg-btn--ghost vg-pager__btn"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              <ArrowLeft size={18} strokeWidth={1.6} aria-hidden />
              Previous
            </button>
            <button
              type="button"
              className="vg-btn--ghost vg-pager__btn"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage(safePage + 1)}
            >
              Next
              <ArrowRight size={18} strokeWidth={1.6} aria-hidden />
            </button>
          </nav>
        ) : null}
      </div>
    </section>
  );
}
