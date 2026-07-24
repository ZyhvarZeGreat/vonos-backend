"use client";

import { useParams, useRouter } from "next/navigation";

export function useRecordNavigation(listSlug: string) {
  const params = useParams<{ tenant: string }>();
  const router = useRouter();
  const tenant = params.tenant;

  const detailPath = (recordId: string) => `/${tenant}/${listSlug}/${recordId}`;

  return {
    detailPath,
    /** Prefetch the Next.js route chunk so the first navigation isn't a compile wait. */
    prefetchDetail: (recordId: string) => {
      router.prefetch(detailPath(recordId));
    },
    goToDetail: (recordId: string) => {
      router.prefetch(detailPath(recordId));
      router.push(detailPath(recordId));
    },
    listPath: `/${tenant}/${listSlug}`,
    goToList: () => router.push(`/${tenant}/${listSlug}`),
  };
}
