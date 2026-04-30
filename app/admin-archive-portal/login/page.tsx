import type { Metadata } from "next";

import { AdminLoginForm } from "@/components/admin-login-form";
import { redirectIfAdminSessionExists } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "管理员登录 | 个人博客知识库",
  description: "隐藏后台登录入口，仅单管理员可访问。",
};

export default async function AdminLoginPage() {
  await redirectIfAdminSessionExists();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#efe6d8_0%,#e8ddcb_44%,#ded2c0_100%)] px-4 py-4 text-stone-900 md:px-6 md:py-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-[1300px] gap-6 rounded-[36px] border border-stone-300/70 bg-[linear-gradient(135deg,#f9f5ec_0%,#f2ecdf_46%,#ebe2d2_100%)] p-4 shadow-[0_30px_90px_rgba(44,36,24,0.10)] md:p-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-[30px] bg-[linear-gradient(135deg,#1f2430_0%,#2d3646_52%,#8b6630_150%)] px-6 py-8 text-stone-50 md:px-8 md:py-10">
          <p className="text-[11px] uppercase tracking-[0.36em] text-stone-300">
            Hidden Admin
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-5xl">
            后台访问控制
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-stone-200">
            后台入口不在前台暴露，支持通过环境变量修改入口路径。登录失败会触发临时限流，会话使用
            `httpOnly` Cookie 并在服务端验签。
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-stone-600/70 bg-white/5 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-stone-300">
                Path Control
              </p>
              <p className="mt-3 text-sm leading-7 text-stone-200">
                使用 ADMIN_ROUTE_BASE 配置后台外部入口。
              </p>
            </div>
            <div className="rounded-[24px] border border-stone-600/70 bg-white/5 p-5">
              <p className="text-[11px] uppercase tracking-[0.28em] text-stone-300">
                Login Guard
              </p>
              <p className="mt-3 text-sm leading-7 text-stone-200">
                连续失败会短暂锁定当前来源与账号组合。
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-stone-300/70 bg-white/85 px-6 py-8 shadow-[0_20px_50px_rgba(44,36,24,0.06)] md:px-8 md:py-10">
          <p className="text-[11px] uppercase tracking-[0.32em] text-stone-500">
            Authentication
          </p>
          <h2 className="mt-4 text-3xl font-semibold text-stone-900">
            管理员登录
          </h2>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            不再展示默认凭据；首次部署后请尽快修改默认账号密码。
          </p>

          <div className="mt-8">
            <AdminLoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
