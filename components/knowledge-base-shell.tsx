"use client";

import Link from "next/link";
import { useState } from "react";

import type { TreeNode } from "@/lib/content";

type KnowledgeBaseShellProps = {
  libraryName: string;
  librarySlug: string;
  currentSlugParts: string[];
  breadcrumbs: Array<{
    label: string;
    href: string;
  }>;
  tree: TreeNode[];
  articleTitle: string;
  articleMeta: React.ReactNode;
  articleBody: React.ReactNode;
};

function isNodeActive(nodePath: string, currentPath: string) {
  return currentPath === nodePath || currentPath.startsWith(`${nodePath}/`);
}

function TreeNodeItem({
  node,
  librarySlug,
  currentPath,
}: {
  node: TreeNode;
  librarySlug: string;
  currentPath: string;
}) {
  const active = isNodeActive(node.path, currentPath);

  if (node.type === "article") {
    const href = `/kb/${librarySlug}/${node.path.replace(/\.md$/, "").replace(/\\/g, "/")}`;

    return (
      <li>
        <Link
          href={href}
          className={`group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition ${
            active
              ? "bg-stone-900 text-stone-50 shadow-[0_12px_30px_rgba(28,23,17,0.18)]"
              : "text-stone-600 hover:bg-white hover:text-stone-900"
          }`}
        >
          <span
            className={`text-[10px] uppercase tracking-[0.28em] ${
              active ? "text-stone-300" : "text-stone-400"
            }`}
          >
            md
          </span>
          <span className="truncate">{node.name.replace(/\.md$/, "")}</span>
        </Link>
      </li>
    );
  }

  const open = active;

  return (
    <li>
      <details open={open} className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-3 py-2 text-sm text-stone-700 transition hover:bg-white">
          <span className="text-[10px] uppercase tracking-[0.28em] text-stone-400">
            dir
          </span>
          <span className="truncate font-medium">{node.name}</span>
        </summary>
        {node.children && node.children.length > 0 ? (
          <ul className="mt-2 space-y-2 border-l border-stone-300/80 pl-4">
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.id}
                node={child}
                librarySlug={librarySlug}
                currentPath={currentPath}
              />
            ))}
          </ul>
        ) : null}
      </details>
    </li>
  );
}

export function KnowledgeBaseShell({
  libraryName,
  librarySlug,
  currentSlugParts,
  breadcrumbs,
  tree,
  articleTitle,
  articleMeta,
  articleBody,
}: KnowledgeBaseShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPath = currentSlugParts.join("/");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f6f2ea_0%,#efe8dc_38%,#e8e0d3_100%)] px-4 py-4 text-stone-900 md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-6">
        <aside className="hidden rounded-[30px] border border-stone-300/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,244,236,0.92))] p-5 shadow-[0_30px_90px_rgba(44,36,24,0.08)] lg:block">
          <div className="rounded-[24px] bg-stone-900 px-5 py-6 text-stone-50">
            <p className="text-[11px] uppercase tracking-[0.32em] text-stone-300">
              Knowledge Base
            </p>
            <h1 className="mt-3 text-2xl font-semibold leading-tight">
              {libraryName}
            </h1>
            <p className="mt-3 text-sm leading-7 text-stone-300">
              公开知识库浏览入口，左侧按目录层级导航，右侧专注阅读正文。
            </p>
          </div>

          <nav className="mt-5" aria-label={`${librarySlug} tree`}>
            <ul className="space-y-2">
              {tree.map((node) => (
                <TreeNodeItem
                  key={node.id}
                  node={node}
                  librarySlug={librarySlug}
                  currentPath={currentPath}
                />
              ))}
            </ul>
          </nav>
        </aside>

        <section className="min-w-0 rounded-[30px] border border-stone-300/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(249,246,240,0.88))] shadow-[0_30px_90px_rgba(44,36,24,0.08)]">
          <header className="border-b border-stone-300/70 px-4 py-4 md:px-8 md:py-6">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen((value) => !value)}
                className="inline-flex items-center rounded-full border border-stone-400/80 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-white lg:hidden"
                aria-expanded={mobileOpen}
                aria-controls="mobile-kb-nav"
              >
                目录导航
              </button>
              <Link
                href="/"
                className="rounded-full border border-stone-300 bg-white/70 px-4 py-2 text-sm text-stone-600 transition hover:bg-white hover:text-stone-900"
              >
                返回知识库首页
              </Link>
            </div>

            {mobileOpen ? (
              <div
                id="mobile-kb-nav"
                className="mt-4 rounded-[24px] border border-stone-300 bg-[#f7f1e8] p-4 lg:hidden"
              >
                <div className="mb-4">
                  <p className="text-[11px] uppercase tracking-[0.32em] text-stone-500">
                    {librarySlug}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold">{libraryName}</h2>
                </div>
                <nav aria-label={`${librarySlug} mobile tree`}>
                  <ul className="space-y-2">
                    {tree.map((node) => (
                      <TreeNodeItem
                        key={node.id}
                        node={node}
                        librarySlug={librarySlug}
                        currentPath={currentPath}
                      />
                    ))}
                  </ul>
                </nav>
              </div>
            ) : null}

            <nav
              aria-label="Breadcrumb"
              className="mt-4 flex flex-wrap items-center gap-2 text-sm text-stone-500"
            >
              {breadcrumbs.map((breadcrumb, index) => (
                <div key={breadcrumb.href} className="flex items-center gap-2">
                  {index > 0 ? <span className="text-stone-300">/</span> : null}
                  <Link
                    href={breadcrumb.href}
                    className="rounded-full px-2 py-1 transition hover:bg-white hover:text-stone-900"
                  >
                    {breadcrumb.label}
                  </Link>
                </div>
              ))}
            </nav>
          </header>

          <article className="px-4 py-6 md:px-8 md:py-10">
            <div className="max-w-4xl">
              <p className="text-[11px] uppercase tracking-[0.35em] text-stone-500">
                Article
              </p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-5xl">
                {articleTitle}
              </h2>
              <div className="mt-6">{articleMeta}</div>
            </div>

            <div className="mt-10">{articleBody}</div>
          </article>
        </section>
      </div>
    </main>
  );
}
