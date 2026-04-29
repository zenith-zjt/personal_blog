import type { Metadata } from "next";

import { AdminImportExportTabs } from "@/components/admin-import-export-tabs";
import { AdminShell } from "@/components/admin-shell";
import { requireAdminSession } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "导入导出 | 个人博客知识库",
  description: "后台系统备份与博客迁移导入导出页面。",
};

export default async function AdminImportExportPage() {
  await requireAdminSession();

  return (
    <AdminShell
      title="导入导出"
      description="导出 data 系统备份或 content 博客迁移包，也可以上传 ZIP 完成配置恢复与知识库增量迁移。"
      currentPath="import-export"
    >
      <AdminImportExportTabs />
    </AdminShell>
  );
}
