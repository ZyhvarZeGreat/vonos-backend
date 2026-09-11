"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import type { CmsPostStatus, CmsPostSummary } from "@vonos/types";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import {
  Hq6FilterGrid,
  Hq6FilterSelect,
} from "@/components/hq6/Hq6FilterFields";
import {
  Hq6StandardListShell,
  useHq6ListChrome,
} from "@/components/hq6/Hq6StandardListShell";
import { deleteCmsPost, listCmsPosts } from "@/lib/api/cms";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { formatHq6Date } from "@/lib/utils/hq6Format";
import { toast } from "@/stores/toastStore";

type CmsPostsListViewProps = {
  scope?: "group" | string;
  basePath?: string;
  title?: string;
  subtitle?: string;
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

function statusBadge(status: CmsPostStatus) {
  if (status === "published") {
    return <span className="hq6-pay-paid">Published</span>;
  }
  return <span className="hq6-pay-due">Draft</span>;
}

export function CmsPostsListView({
  scope = "group",
  basePath = "/admin/cms/posts",
  title,
  subtitle,
}: CmsPostsListViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const chrome = useHq6ListChrome("cms-posts");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CmsPostStatus | "">("");
  const [deleteTarget, setDeleteTarget] = useState<CmsPostSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const isAdminBase = basePath.startsWith("/admin");
  const newHref = isAdminBase ? `${basePath}/new` : `${basePath}?new=1`;
  const editHref = useCallback(
    (id: string) =>
      isAdminBase ? `${basePath}/${id}/edit` : `${basePath}?edit=${id}`,
    [basePath, isAdminBase],
  );

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["cms-posts", scope, status, debouncedSearch],
    queryFn: () =>
      listCmsPosts({
        scope,
        status: status || undefined,
        search: debouncedSearch.trim() || undefined,
        limit: 100,
      }),
  });

  const rows = data?.items ?? [];

  const columns: ColumnConfig<CmsPostSummary>[] = useMemo(
    () => [
      {
        key: "actions",
        header: "Action",
        sortable: false,
        render: (post) => (
          <Hq6ActionsMenu
            items={[
              {
                id: "edit",
                label: "Edit",
                onClick: () => router.push(editHref(post.id)),
              },
              {
                id: "delete",
                label: "Delete",
                danger: true,
                onClick: () => setDeleteTarget(post),
              },
            ]}
          />
        ),
      },
      {
        key: "title",
        header: "Title",
        render: (post) => (
          <Link
            href={editHref(post.id)}
            className="font-medium text-[var(--hq6-blue)] hover:underline"
          >
            {post.title}
          </Link>
        ),
      },
      {
        key: "slug",
        header: "Slug",
        render: (post) => (
          <span className="text-[#64748b]">/{post.slug}</span>
        ),
      },
      { key: "category", header: "Category" },
      {
        key: "status",
        header: "Status",
        render: (post) => statusBadge(post.status),
      },
      {
        key: "publishedAt",
        header: "Published",
        sortValue: (post) =>
          post.publishedAt ? new Date(post.publishedAt).getTime() : 0,
        render: (post) =>
          post.publishedAt ? formatHq6Date(post.publishedAt) : "—",
      },
      { key: "author", header: "Author" },
      {
        key: "readMinutes",
        header: "Read time",
        render: (post) => `${post.readMinutes} min`,
      },
    ],
    [editHref, router],
  );

  const columnOptions = columns
    .filter((column) => column.key !== "actions")
    .map((column) => ({ key: column.key, label: String(column.header) }));

  const effectiveColumns = useMemo(() => {
    if (!chrome.visibleColumnKeys) return columns;
    const allowed = new Set(chrome.visibleColumnKeys);
    return columns.filter((column) => allowed.has(column.key));
  }, [chrome.visibleColumnKeys, columns]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCmsPost(deleteTarget.id, scope);
      toast.success("Post deleted");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["cms-posts"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Hq6StandardListShell
      slug="cms-posts"
      title={title}
      subtitle={subtitle}
      tabLabel="All posts"
      boxTitle="All posts"
      addHref={newHref}
      addLabel="Add post"
      hideExports
      chrome={chrome}
      pageSize={50}
      onPageSizeChange={() => undefined}
      searchValue={search}
      onSearchChange={setSearch}
      columnOptions={columnOptions}
      defaultVisibleColumnKeys={columnOptions.map((column) => column.key)}
      filters={
        <Hq6FilterGrid>
          <Hq6FilterSelect
            label="Status"
            value={status}
            onChange={(value) => setStatus(value as CmsPostStatus | "")}
            options={STATUS_OPTIONS}
          />
        </Hq6FilterGrid>
      }
      tabs={[
        {
          id: "posts",
          label: "All posts",
          active: true,
          icon: <FileText className="h-4 w-4" />,
        },
      ]}
      pagination={{
        pageIndex: 0,
        pageSize: 50,
        itemCount: rows.length,
        hasMore: false,
        canGoPrev: false,
        onPrev: () => undefined,
        onNext: () => undefined,
        onPageSizeChange: () => undefined,
        totalItems: rows.length,
        isBusy: isFetching && !isLoading,
      }}
      modals={
        <Hq6ConfirmModal
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void handleDelete()}
          title="Delete post"
          message={`Delete "${deleteTarget?.title ?? "this post"}"? This cannot be undone.`}
          confirmLabel="Delete"
          confirming={deleting}
          danger
          alertStyle
        />
      }
    >
      <DataTable
        data={rows}
        columns={effectiveColumns}
        displayMode="table"
        embedded
        disablePagination
        isLoading={isLoading}
        isFetching={isFetching && !isLoading}
        error={isError ? "Could not load posts." : null}
        emptyState={{ message: "No posts yet. Create your first article." }}
        onRowClick={(post) => router.push(editHref(post.id))}
      />
      {isError ? (
        <div className="mt-3 flex justify-center">
          <button type="button" className="hq6-btn" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      ) : null}
    </Hq6StandardListShell>
  );
}
