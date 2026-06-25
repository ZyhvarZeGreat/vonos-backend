"use client";

import { useParams, useRouter } from "next/navigation";

export function useRecordNavigation(listSlug: string) {
  const params = useParams<{ tenant: string }>();
  const router = useRouter();
  const tenant = params.tenant;

  return {
    detailPath: (recordId: string) => `/${tenant}/${listSlug}/${recordId}`,
    goToDetail: (recordId: string) => router.push(`/${tenant}/${listSlug}/${recordId}`),
    listPath: `/${tenant}/${listSlug}`,
    goToList: () => router.push(`/${tenant}/${listSlug}`),
  };
}
