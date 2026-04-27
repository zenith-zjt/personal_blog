import type { Metadata } from "next";

import { AdminShell } from "@/components/admin-shell";
import { requireAdminSession } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "后台概览 | 个人博客知识库",
  description: "隐藏后台入口的阶段 4/5 概览页。",
};

export default async function AdminDashboardPage() {
  const session = await requireAdminSession();

  return (
    <AdminShell
      title="后台访问已受控，当前管理员已登录。"
      description="当前阶段已完成隐藏后台认证闭环，并补充了知识库树查看与 Markdown / 图片上传能力。"
      currentPath="dashboard"
    >
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[30px] border border-stone-300/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(249,246,240,0.88))] p-6 shadow-[0_30px_90px_rgba(44,36,24,0.08)] md:p-8">
          <p className="text-[11px] uppercase tracking-[0.32em] text-stone-500">
            Session
          </p>
          <h2 className="mt-3 text-3xl font-semibold">当前会话状态</h2>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-stone-300 bg-white/80 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-stone-500">
                登录用户
              </p>
              <p className="mt-3 text-xl font-medium text-stone-900">
                {session.username}
              </p>
            </div>
            <div className="rounded-[24px] border border-stone-300 bg-white/80 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-stone-500">
                会话状态
              </p>
              <p className="mt-3 text-xl font-medium text-stone-900">有效</p>
            </div>
          </div>
        </div>

        <aside className="rounded-[30px] border border-stone-300/70 bg-[#f7f0e5] p-6 shadow-[0_30px_90px_rgba(44,36,24,0.08)] md:p-8">
          <p className="text-[11px] uppercase tracking-[0.32em] text-stone-500">
            Stage 5
          </p>
          <ul className="mt-4 space-y-4 text-sm leading-7 text-stone-600">
            <li>隐藏后台路径不会在前台任何入口暴露。</li>
            <li>未登录访问后台时会重定向到登录页。</li>
            <li>管理员现在可以查看知识库树与资源目录。</li>
            <li>管理员现在可以上传 `.md` 与图片资源。</li>
          </ul>
        </aside>
      </section>
    </AdminShell>
  );
}
