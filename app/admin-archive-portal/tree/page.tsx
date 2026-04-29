import type { Metadata } from "next";

import { AdminShell } from "@/components/admin-shell";
import { AdminTreeWorkspace } from "@/components/admin-tree-workspace";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  getAdminKnowledgeBaseTrees,
  type AdminSelectionKind,
} from "@/lib/content";

export const metadata: Metadata = {
  title: "知识库管理树 | 个人博客知识库",
  description: "后台知识库树查看、排序、上传与删除页面。",
};

type AdminTreePageProps = {
  searchParams: Promise<{
    selected?: string;
    kind?: AdminSelectionKind;
    status?: "success" | "error";
    message?: string;
  }>;
};

function normalizeKind(
  kind: AdminSelectionKind | undefined,
  selectedPath: string,
): AdminSelectionKind {
  if (
    kind === "library" ||
    kind === "directory" ||
    kind === "article" ||
    kind === "assets" ||
    kind === "asset"
  ) {
    return kind;
  }

  if (!selectedPath) {
    return "directory";
  }

  if (!selectedPath.includes("/")) {
    return "library";
  }

  if (selectedPath.endsWith(".assets")) {
    return "assets";
  }

  return selectedPath.endsWith(".md") ? "article" : "directory";
}

export default async function AdminTreePage({
  searchParams,
}: AdminTreePageProps) {
  await requireAdminSession();
  const libraries = await getAdminKnowledgeBaseTrees();
  const { selected, kind, status, message } = await searchParams;
  const initialLibrarySlug = libraries[0]?.slug ?? "";
  const selectedPath = selected?.trim() || initialLibrarySlug;
  const selectedKind = normalizeKind(kind, selectedPath);

  return (
    <AdminShell
      title="知识库管理树"
      description="在同一页面完成知识库树查看、上传、新建文件夹、拖动排序和删除操作。目录与文章排序会同时影响前台和后台展示顺序。"
      currentPath="tree"
    >
      <AdminTreeWorkspace
        libraries={libraries}
        selectedPath={selectedPath}
        selectedKind={selectedKind}
        status={status}
        message={message}
      />
    </AdminShell>
  );
}
