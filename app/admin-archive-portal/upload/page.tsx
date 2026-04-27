import type { Metadata } from "next";

import { AdminShell } from "@/components/admin-shell";
import { AdminUploadForm } from "@/components/admin-upload-form";
import { requireAdminSession } from "@/lib/admin-auth";
import { listContentDirectoryOptions } from "@/lib/content";

export const metadata: Metadata = {
  title: "上传文章 | 个人博客知识库",
  description: "后台 Markdown 与图片上传页。",
};

export default async function AdminUploadPage() {
  await requireAdminSession();
  const directoryOptions = await listContentDirectoryOptions();

  return (
    <AdminShell
      title="Markdown 与图片上传"
      description="当前后台不提供在线编辑器，文章维护完全基于文件上传。Markdown 写入目标目录，图片自动归档到同级 `resource/`。"
      currentPath="upload"
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[30px] border border-stone-300/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(249,246,240,0.88))] p-6 shadow-[0_30px_90px_rgba(44,36,24,0.08)] md:p-8">
          <p className="text-[11px] uppercase tracking-[0.32em] text-stone-500">
            Upload
          </p>
          <h2 className="mt-3 text-3xl font-semibold">上传文章与资源文件</h2>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            选择一个知识库目录，上传单个 `.md` 文件和可选图片资源。图片会进入该目录下的 `resource/` 文件夹。
          </p>

          <div className="mt-8">
            <AdminUploadForm directoryOptions={directoryOptions} />
          </div>
        </div>

        <aside className="rounded-[30px] border border-stone-300/70 bg-[#f7f0e5] p-6 shadow-[0_30px_90px_rgba(44,36,24,0.08)] md:p-8">
          <p className="text-[11px] uppercase tracking-[0.32em] text-stone-500">
            Rules
          </p>
          <ul className="mt-4 space-y-4 text-sm leading-7 text-stone-600">
            <li>文章文件必须是 `.md`。</li>
            <li>图片支持 `.png`、`.jpg`、`.jpeg`、`.gif`、`.webp`、`.svg`。</li>
            <li>默认不覆盖同名文件，避免误操作。</li>
            <li>前台树会隐藏 `resource`，后台树会显示它。</li>
          </ul>
        </aside>
      </section>
    </AdminShell>
  );
}
