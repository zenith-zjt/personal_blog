"use client";

import { useActionState, useRef, useState } from "react";

import {
  adminImportBlogMigrationAction,
  adminImportSystemBackupAction,
  type AdminSettingsFormState,
} from "@/app/admin-archive-portal/actions";

const initialState: AdminSettingsFormState = {
  message: "",
  success: false,
};

const panelClass =
  "rounded-lg border border-stone-300/70 bg-white/90 p-5 shadow-[0_18px_60px_rgba(44,36,24,0.08)] md:p-8";
const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition file:mr-4 file:rounded-md file:border-0 file:bg-stone-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10";

function Feedback({ state }: { state: AdminSettingsFormState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      role={state.success ? "status" : "alert"}
      className={`rounded-lg border px-4 py-3 text-sm ${
        state.success
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {state.message}
    </p>
  );
}

export function AdminImportExportTabs() {
  const [activeTab, setActiveTab] = useState<"system" | "blog">("system");
  const systemOverwriteRef = useRef<HTMLInputElement>(null);
  const [systemState, systemAction, systemPending] = useActionState(
    adminImportSystemBackupAction,
    initialState,
  );
  const [blogState, blogAction, blogPending] = useActionState(
    adminImportBlogMigrationAction,
    initialState,
  );

  return (
    <section className={panelClass}>
      <div className="flex w-full flex-wrap gap-2 border-b border-stone-200 pb-4">
        <button
          type="button"
          onClick={() => setActiveTab("system")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "system"
              ? "bg-stone-900 text-white"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          系统备份
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("blog")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "blog"
              ? "bg-stone-900 text-white"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          博客迁移
        </button>
      </div>

      {activeTab === "system" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-lg border border-stone-200 bg-[#fdfbf6] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-stone-500">
              Export data
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-stone-950">
              导出系统备份
            </h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              将 data 目录中的账号配置与资源文件打包成 ZIP，通过浏览器下载。
            </p>
            <a
              href="/admin-archive-portal/import-export/system/export"
              className="mt-6 inline-flex rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
            >
              下载系统备份
            </a>
          </article>

          <form
            action={systemAction}
            className="rounded-lg border border-stone-200 bg-[#fdfbf6] p-5"
            onSubmit={(event) => {
              const confirmed = window.confirm(
                "如果 data 目录已存在文件，导入会覆盖同名文件。是否确认覆盖并继续导入？",
              );

              if (!confirmed) {
                event.preventDefault();
                return;
              }

              if (systemOverwriteRef.current) {
                systemOverwriteRef.current.value = "true";
              }
            }}
          >
            <input ref={systemOverwriteRef} type="hidden" name="overwrite" value="false" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-stone-500">
              Import data
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-stone-950">
              导入系统备份
            </h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              上传 ZIP 后会校验账号配置文件结构；配置非法时不会写入。
            </p>
            <input
              id="system-backup-file"
              name="backupFile"
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              className={`${inputClass} mt-5`}
            />
            <div className="mt-5">
              <Feedback state={systemState} />
            </div>
            <button
              type="submit"
              disabled={systemPending}
              className="mt-5 rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-500"
            >
              {systemPending ? "导入中..." : "导入系统备份"}
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-lg border border-stone-200 bg-[#fdfbf6] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-stone-500">
              Export content
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-stone-950">
              导出博客内容
            </h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              将 content 目录中的知识库、Markdown、排序配置和图片资源打包下载。
            </p>
            <a
              href="/admin-archive-portal/import-export/blog/export"
              className="mt-6 inline-flex rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
            >
              下载博客迁移包
            </a>
          </article>

          <form
            action={blogAction}
            className="rounded-lg border border-stone-200 bg-[#fdfbf6] p-5"
            onSubmit={(event) => {
              if (
                !window.confirm(
                  "博客迁移为增量导入，同名文件会被覆盖；非 Markdown、非排序配置和非法资源文件会被自动排除。是否继续？",
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-stone-500">
              Import content
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-stone-950">
              导入博客迁移包
            </h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              文章目录只接收 Markdown 与排序配置，resource 目录只接收图片文件。
            </p>
            <input
              id="blog-migration-file"
              name="migrationFile"
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              className={`${inputClass} mt-5`}
            />
            <div className="mt-5">
              <Feedback state={blogState} />
            </div>
            <button
              type="submit"
              disabled={blogPending}
              className="mt-5 rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-500"
            >
              {blogPending ? "导入中..." : "导入博客迁移包"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
