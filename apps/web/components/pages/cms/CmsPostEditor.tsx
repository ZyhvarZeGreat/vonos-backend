"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CmsPost, CmsPostStatus, CreateCmsPostInput } from "@vonos/types";
import { Hq6BusyButton } from "@/components/hq6/Hq6BusyButton";
import { Hq6FormShell } from "@/components/hq6/Hq6Chrome";
import { createCmsPost, getCmsPost, updateCmsPost } from "@/lib/api/cms";
import { toast } from "@/stores/toastStore";

type SectionDraft = {
  sectionId: string;
  title: string;
  paragraphs: string;
};

type CmsPostEditorProps = {
  postId?: string;
  scope?: "group" | string;
  basePath?: string;
};

const emptySection = (): SectionDraft => ({
  sectionId: "",
  title: "",
  paragraphs: "",
});

function postToDraft(post: CmsPost) {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    category: post.category,
    coverImageUrl: post.coverImageUrl,
    author: post.author,
    status: post.status,
    publishedAt: post.publishedAt?.slice(0, 10) ?? "",
    intro: post.intro.join("\n\n"),
    sections: post.sections.map((section) => ({
      sectionId: section.sectionId,
      title: section.title,
      paragraphs: section.paragraphs.join("\n\n"),
    })),
  };
}

export function CmsPostEditor({
  postId,
  scope = "group",
  basePath = "/admin/cms/posts",
}: CmsPostEditorProps) {
  const router = useRouter();
  const isEdit = Boolean(postId);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("Maintenance");
  const [coverImageUrl, setCoverImageUrl] = useState("/images/vonos-photos/IMG_0435.jpg");
  const [author, setAuthor] = useState("Vonos Workshop");
  const [status, setStatus] = useState<CmsPostStatus>("draft");
  const [publishedAt, setPublishedAt] = useState("");
  const [intro, setIntro] = useState("");
  const [sections, setSections] = useState<SectionDraft[]>([emptySection()]);

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    (async () => {
      try {
        const post = await getCmsPost(postId, scope);
        if (cancelled) return;
        const draft = postToDraft(post);
        setTitle(draft.title);
        setSlug(draft.slug);
        setExcerpt(draft.excerpt);
        setCategory(draft.category);
        setCoverImageUrl(draft.coverImageUrl);
        setAuthor(draft.author);
        setStatus(draft.status);
        setPublishedAt(draft.publishedAt);
        setIntro(draft.intro);
        setSections(draft.sections.length ? draft.sections : [emptySection()]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load post");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId, scope]);

  const buildPayload = (): CreateCmsPostInput => ({
    title: title.trim(),
    slug: slug.trim() || undefined,
    excerpt: excerpt.trim(),
    category: category.trim(),
    coverImageUrl: coverImageUrl.trim(),
    author: author.trim(),
    status,
    publishedAt: publishedAt ? `${publishedAt}T12:00:00.000Z` : null,
    intro: intro
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
    sections: sections
      .filter((section) => section.title.trim())
      .map((section) => ({
        sectionId:
          section.sectionId.trim() ||
          section.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        title: section.title.trim(),
        paragraphs: section.paragraphs
          .split(/\n\s*\n/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean),
      })),
  });

  const handleSave = async () => {
    if (!title.trim() || !excerpt.trim()) {
      toast.error("Title and excerpt are required");
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit && postId) {
        await updateCmsPost(postId, payload, scope);
        toast.success("Post updated");
      } else {
        const created = await createCmsPost(payload, scope);
        toast.success("Post created");
        const editPath = basePath.startsWith("/admin")
          ? `${basePath}/${created.id}/edit`
          : `${basePath}?edit=${created.id}`;
        router.replace(editPath);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Hq6FormShell title={isEdit ? "Edit post" : "Add post"}>
        <p className="text-sm text-[#64748b]">Loading…</p>
      </Hq6FormShell>
    );
  }

  return (
    <Hq6FormShell
      multiCard
      title={isEdit ? "Edit post" : "Add post"}
      subtitle="Blog article for the public marketing site"
    >
      <section className="hq6-form-card">
        <h2 className="hq6-form-card-title">Post details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="hq6-form-label">
            <span>
              Title<span className="req">*</span>
            </span>
            <input
              className="form-control"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="hq6-form-label">
            <span>Slug</span>
            <input
              className="form-control"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="auto-generated from title"
            />
          </label>
          <label className="hq6-form-label md:col-span-2">
            <span>
              Excerpt<span className="req">*</span>
            </span>
            <textarea
              className="form-control min-h-[80px]"
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
            />
          </label>
          <label className="hq6-form-label">
            <span>Category</span>
            <input
              className="form-control"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
          </label>
          <label className="hq6-form-label">
            <span>Author</span>
            <input
              className="form-control"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
            />
          </label>
          <label className="hq6-form-label">
            <span>Cover image URL</span>
            <input
              className="form-control"
              value={coverImageUrl}
              onChange={(event) => setCoverImageUrl(event.target.value)}
            />
          </label>
          <label className="hq6-form-label">
            <span>Status</span>
            <select
              className="form-control"
              value={status}
              onChange={(event) => setStatus(event.target.value as CmsPostStatus)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
          <label className="hq6-form-label">
            <span>Published date</span>
            <input
              type="date"
              className="form-control"
              value={publishedAt}
              onChange={(event) => setPublishedAt(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="hq6-form-card">
        <h2 className="hq6-form-card-title">Intro</h2>
        <label className="hq6-form-label">
          <span>Intro paragraphs</span>
          <p className="mb-2 text-xs text-[#64748b]">
            Separate paragraphs with a blank line.
          </p>
          <textarea
            className="form-control min-h-[120px]"
            value={intro}
            onChange={(event) => setIntro(event.target.value)}
          />
        </label>
      </section>

      <section className="hq6-form-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="hq6-form-card-title mb-0">Sections</h2>
          <button
            type="button"
            className="hq6-btn hq6-btn-sm hq6-btn-blue"
            onClick={() => setSections((current) => [...current, emptySection()])}
          >
            Add section
          </button>
        </div>
        <div className="space-y-4">
          {sections.map((section, index) => (
            <div
              key={`section-${index}`}
              className="rounded-lg border border-[var(--hq6-border,#e3e8ef)] bg-[#f8fafc] p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-[#334155]">
                  Section {index + 1}
                </span>
                <button
                  type="button"
                  className="hq6-btn hq6-btn-sm hq6-btn-danger"
                  onClick={() =>
                    setSections((current) => current.filter((_, i) => i !== index))
                  }
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-3">
                <label className="hq6-form-label">
                  <span>Section ID</span>
                  <input
                    className="form-control"
                    placeholder="optional — auto from subtitle"
                    value={section.sectionId}
                    onChange={(event) =>
                      setSections((current) =>
                        current.map((row, i) =>
                          i === index ? { ...row, sectionId: event.target.value } : row,
                        ),
                      )
                    }
                  />
                </label>
                <label className="hq6-form-label">
                  <span>Subtitle</span>
                  <input
                    className="form-control"
                    placeholder="Section subtitle"
                    value={section.title}
                    onChange={(event) =>
                      setSections((current) =>
                        current.map((row, i) =>
                          i === index ? { ...row, title: event.target.value } : row,
                        ),
                      )
                    }
                  />
                </label>
                <label className="hq6-form-label">
                  <span>Paragraphs</span>
                  <textarea
                    className="form-control min-h-[120px]"
                    placeholder="Blank line between each paragraph"
                    value={section.paragraphs}
                    onChange={(event) =>
                      setSections((current) =>
                        current.map((row, i) =>
                          i === index ? { ...row, paragraphs: event.target.value } : row,
                        ),
                      )
                    }
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Hq6BusyButton
          className="hq6-btn-purple"
          busy={saving}
          busyLabel="Saving…"
          disabled={!title.trim() || !excerpt.trim()}
          onClick={() => void handleSave()}
        >
          {isEdit ? "Save changes" : "Create post"}
        </Hq6BusyButton>
        <Link href={basePath} className="btn btn-default">
          Back to list
        </Link>
      </div>
    </Hq6FormShell>
  );
}
