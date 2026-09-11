"use client";

import { useParams } from "next/navigation";
import { CmsPostEditor } from "@/components/pages/cms/CmsPostEditor";

export default function AdminCmsEditPostPage() {
  const params = useParams<{ id: string }>();
  return <CmsPostEditor postId={params.id} scope="group" />;
}
