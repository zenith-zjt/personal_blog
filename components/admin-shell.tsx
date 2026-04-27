import Link from "next/link";

import { adminLogoutAction } from "@/app/admin-archive-portal/actions";

type AdminShellProps = {
  title: string;
  description: string;
  currentPath: "dashboard" | "tree";
  children: React.ReactNode;
};

const adminNavItems = [
  {
    key: "dashboard",
    label: "后台概览",
    href: "/admin-archive-portal",
  },
  {
    key: "tree",
    label: "知识库管理树",
    href: "/admin-archive-portal/tree",
  },
] as const;

export function AdminShell({
  title,
  description,
  currentPath,
  children,
}: AdminShellProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f2eadf_0%,#e7dccb_44%,#ddd0be_100%)] px-4 py-4 text-stone-900 md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
        <section className="rounded-[34px] border border-stone-300/70 bg-[linear-gradient(135deg,#1f2430_0%,#2d3646_44%,#8f6a34_155%)] px-6 py-8 text-stone-50 shadow-[0_30px_90px_rgba(44,36,24,0.12)] md:px-10 md:py-12">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.36em] text-stone-300">
                Admin Portal
              </p>
              <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-5xl">
                {title}
              </h1>
              <p className="mt-6 text-base leading-8 text-stone-200">
                {description}
              </p>
            </div>

            <form action={adminLogoutAction}>
              <button
                type="submit"
                className="rounded-full border border-stone-300/40 bg-white/10 px-5 py-3 text-sm font-medium text-stone-50 transition hover:bg-white/20"
              >
                退出登录
              </button>
            </form>
          </div>

          <nav className="mt-8 flex flex-wrap gap-3" aria-label="Admin navigation">
            {adminNavItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                aria-current={currentPath === item.key ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  currentPath === item.key
                    ? "border border-stone-200 bg-white !text-black shadow-[0_8px_24px_rgba(255,255,255,0.22)]"
                    : "border border-stone-300/40 bg-white/10 text-stone-50 hover:bg-white/20"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </section>

        {children}
      </div>
    </main>
  );
}
