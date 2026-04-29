import type { Metadata } from "next";

import { AdminShell } from "@/components/admin-shell";
import { AdminSettingsTabs } from "@/components/admin-settings-tabs";
import { requireAdminSession } from "@/lib/admin-auth";
import { getAdminAccountSnapshot } from "@/lib/admin-profile";

export const metadata: Metadata = {
  title: "账号设置 | 个人博客知识库",
  description: "后台管理员安全信息与公开资料维护页面。",
};

export default async function AdminSettingsPage() {
  await requireAdminSession();
  const account = await getAdminAccountSnapshot();

  return (
    <AdminShell
      title="账号设置"
      description="维护后台登录安全信息，也维护前台个人博客首页展示的公开资料。"
      currentPath="settings"
    >
      <AdminSettingsTabs account={account} />
    </AdminShell>
  );
}
