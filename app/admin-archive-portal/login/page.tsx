import type { Metadata } from "next";

import { AdminLoginForm } from "@/components/admin-login-form";
import {
  getAdminCredentialHints,
  redirectIfAdminSessionExists,
} from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "管理员登录 | 个人博客知识库",
  description: "隐藏后台登录入口，仅单管理员可访问。",
};

export default async function AdminLoginPage() {
  await redirectIfAdminSessionExists();
  const credentialHints = getAdminCredentialHints();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#efe6d8_0%,#e8ddcb_44%,#ded2c0_100%)] px-4 py-4 text-stone-900 md:px-6 md:py-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-[1300px] gap-6 rounded-[36px] border border-stone-300/70 bg-[linear-gradient(135deg,#f9f5ec_0%,#f2ecdf_46%,#ebe2d2_100%)] p-4 shadow-[0_30px_90px_rgba(44,36,24,0.10)] md:p-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-[30px] bg-[linear-gradient(135deg,#1f2430_0%,#2d3646_52%,#8b6630_150%)] px-6 py-8 text-stone-50 md:px-8 md:py-10">
          <p className="text-[11px] uppercase tracking-[0.36em] text-stone-300">
            Hidden Admin
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-5xl">
            隐藏后台访问控制
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-stone-200">
            这是仅管理员可访问的后台入口，不会在任何前台导航和公开页面中暴露。当前阶段已启用单管理员登录与会话维持。
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-stone-600/70 bg-white/5 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-stone-300">
                默认账号
              </p>
              <p className="mt-3 text-lg font-medium">{credentialHints.defaultUsername}</p>
            </div>
            <div className="rounded-[24px] border border-stone-600/70 bg-white/5 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-stone-300">
                默认密码
              </p>
              <p className="mt-3 text-lg font-medium">{credentialHints.defaultPassword}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-stone-300/70 bg-white/85 px-6 py-8 shadow-[0_20px_50px_rgba(44,36,24,0.06)] md:px-8 md:py-10">
          <p className="text-[11px] uppercase tracking-[0.32em] text-stone-500">
            Authentication
          </p>
          <h2 className="mt-4 text-3xl font-semibold text-stone-900">管理员登录</h2>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            登录成功后会写入 `httpOnly` 会话 cookie，并对隐藏后台页面进行访问控制。
          </p>

          <div className="mt-8">
            <AdminLoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
