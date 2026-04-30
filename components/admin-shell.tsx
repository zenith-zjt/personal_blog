import Link from "next/link";

import { adminLogoutAction } from "@/app/admin-archive-portal/actions";
import { getAdminPath } from "@/lib/admin-paths";

type AdminShellProps = {
  title: string;
  description: string;
  currentPath: "dashboard" | "tree" | "settings" | "import-export";
  children: React.ReactNode;
};

const adminNavItems = [
  {
    key: "dashboard",
    label: "后台概览",
    href: getAdminPath(),
  },
  {
    key: "tree",
    label: "知识库管理",
    href: getAdminPath("/tree"),
  },
  {
    key: "settings",
    label: "账号设置",
    href: getAdminPath("/settings"),
  },
  {
    key: "import-export",
    label: "导入导出",
    href: getAdminPath("/import-export"),
  },
] as const;

export function AdminShell({
  title,
  description,
  currentPath,
  children,
}: AdminShellProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,#f4eadb_0%,#e9ddcb_42%,#d9cbb7_100%)] px-4 py-4 text-stone-900 md:px-6 md:py-6">
      <div className="mx-auto grid w-full max-w-[1560px] gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#202632,#151922)] p-4 text-stone-50 shadow-[0_26px_80px_rgba(37,29,19,0.16)] lg:sticky lg:top-6 lg:h-[calc(100vh-48px)]">
          <div className="rounded-[22px] border border-white/10 bg-white/8 px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.34em] text-stone-400">
              Admin Portal
            </p>
            <p className="mt-2 truncate text-base font-semibold text-white">
              Knowledge Desk
            </p>
          </div>

          <nav className="mt-4 space-y-2" aria-label="Admin navigation">
            {adminNavItems.map((item, index) => (
              <Link
                key={item.key}
                href={item.href}
                aria-current={currentPath === item.key ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  currentPath === item.key
                    ? "border-white bg-[#f8f2e8] !text-stone-950 shadow-[0_18px_45px_rgba(0,0,0,0.22)]"
                    : "border-white/10 bg-white/5 text-stone-300 hover:border-white/25 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-[11px] ${
                    currentPath === item.key
                      ? "bg-stone-950 text-white"
                      : "border border-white/10 text-stone-400 group-hover:text-white"
                  }`}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 truncate">{item.label}</span>
              </Link>
            ))}
          </nav>

          <form action={adminLogoutAction} className="mt-5">
            <button
              type="submit"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-stone-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
            >
              退出登录
            </button>
          </form>
        </aside>

        <div className="min-w-0 space-y-5">
          <section className="rounded-[26px] border border-stone-300/70 bg-[linear-gradient(135deg,#fbf7ef_0%,#efe5d7_100%)] px-5 py-3 shadow-[0_18px_55px_rgba(44,36,24,0.08)]">
            <div className="flex min-h-12 flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold leading-7 text-stone-950 md:text-2xl">
                  {title}
                </h1>
                <p className="mt-1 line-clamp-1 text-sm text-stone-500">
                  {description}
                </p>
              </div>
              <span className="rounded-full border border-stone-300 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-stone-500">
                Control
              </span>
            </div>
          </section>

          {children}
        </div>
      </div>
    </main>
  );
}
