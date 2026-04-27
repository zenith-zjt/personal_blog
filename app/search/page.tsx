import Link from "next/link";
import type { Metadata } from "next";

import { SearchForm } from "@/components/search-form";
import { searchArticles } from "@/lib/content";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export const metadata: Metadata = {
  title: "搜索文章 | 个人博客知识库",
  description: "按标题、文件名、路径或正文关键词搜索知识库文章。",
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query ? await searchArticles(query) : [];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f6f2ea_0%,#efe8dc_36%,#e6ddce_100%)] px-4 py-4 text-stone-900 md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
        <section className="rounded-[34px] border border-stone-300/70 bg-[linear-gradient(135deg,#1f2430_0%,#2b3340_48%,#8f6d38_160%)] px-6 py-8 text-stone-50 shadow-[0_30px_90px_rgba(44,36,24,0.12)] md:px-10 md:py-12">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.36em] text-stone-300">
              Search
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-6xl">
              全局检索单篇文章。
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-stone-200 md:text-lg">
              当前搜索覆盖文章标题、文件名、知识库、路径和正文内容，优先返回更匹配的文章。
            </p>
          </div>

          <div className="mt-8 max-w-3xl">
            <SearchForm initialQuery={query} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[30px] border border-stone-300/70 bg-[#f7f0e5] p-6 shadow-[0_30px_90px_rgba(44,36,24,0.08)]">
            <p className="text-[11px] uppercase tracking-[0.32em] text-stone-500">
              Search Scope
            </p>
            <ul className="mt-4 space-y-4 text-sm leading-7 text-stone-600">
              <li>标题匹配优先级最高。</li>
              <li>文件名和路径用于快速定位单篇文章。</li>
              <li>正文命中会提供摘要片段。</li>
              <li>当前阶段为服务端扫描实现，后续可升级索引。</li>
            </ul>
          </aside>

          <div className="rounded-[30px] border border-stone-300/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(249,246,240,0.9))] p-6 shadow-[0_30px_90px_rgba(44,36,24,0.08)] md:p-8">
            {!query ? (
              <div className="rounded-[28px] border border-dashed border-stone-300 bg-white/70 px-6 py-12 text-center">
                <p className="text-sm uppercase tracking-[0.32em] text-stone-400">
                  Empty Query
                </p>
                <h2 className="mt-4 text-2xl font-semibold text-stone-900">
                  先输入搜索词，再开始检索。
                </h2>
                <p className="mt-4 text-sm leading-7 text-stone-600">
                  你可以尝试搜索 `welcome`、`java`、`知识库` 或某篇文章路径中的关键词。
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-stone-300 bg-white/70 px-6 py-12 text-center">
                <p className="text-sm uppercase tracking-[0.32em] text-stone-400">
                  No Result
                </p>
                <h2 className="mt-4 text-2xl font-semibold text-stone-900">
                  没有找到与 “{query}” 相关的文章。
                </h2>
                <p className="mt-4 text-sm leading-7 text-stone-600">
                  可以尝试缩短关键词，或改用标题、文件名、路径中的核心词重新搜索。
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.32em] text-stone-500">
                      Result
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold">
                      找到 {results.length} 条结果
                    </h2>
                  </div>
                  <Link
                    href="/"
                    className="rounded-full border border-stone-300 bg-white/80 px-4 py-2 text-sm text-stone-600 transition hover:bg-white hover:text-stone-900"
                  >
                    返回知识库首页
                  </Link>
                </div>

                <div className="mt-8 space-y-5" data-testid="search-results">
                  {results.map((result) => (
                    <Link
                      key={result.id}
                      href={result.href}
                      className="block rounded-[28px] border border-stone-300/80 bg-white/80 p-6 transition hover:-translate-y-0.5 hover:border-stone-500 hover:shadow-[0_20px_40px_rgba(44,36,24,0.08)]"
                    >
                      <div className="flex flex-wrap gap-2 text-sm text-stone-500">
                        <span className="rounded-full border border-stone-300 bg-stone-50 px-3 py-1">
                          {result.libraryName}
                        </span>
                        <span className="rounded-full border border-stone-300 bg-stone-50 px-3 py-1">
                          {result.fileName}
                        </span>
                        {result.updatedAt ? (
                          <span className="rounded-full border border-stone-300 bg-stone-50 px-3 py-1">
                            更新于 {result.updatedAt}
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-4 text-2xl font-semibold text-stone-900">
                        {result.title}
                      </h3>
                      <p className="mt-3 break-all text-sm text-stone-500">
                        {result.relativePath}
                      </p>
                      <p className="mt-4 text-sm leading-7 text-stone-700">
                        {result.description ?? result.excerpt}
                      </p>
                      {result.description && result.excerpt ? (
                        <p className="mt-3 text-sm leading-7 text-stone-500">
                          {result.excerpt}
                        </p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
