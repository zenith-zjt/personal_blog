import Link from "next/link";

import { SearchForm } from "@/components/search-form";
import { getDefaultArticleSlug, listKnowledgeBases } from "@/lib/content";

export default async function Home() {
  const libraries = await listKnowledgeBases();
  const featuredLibraries = await Promise.all(
    libraries.map(async (library) => ({
      ...library,
      defaultSlug: await getDefaultArticleSlug(library.slug),
    })),
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f6f2ea_0%,#efe8dc_34%,#e6ddce_100%)] px-4 py-4 text-stone-900 md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
        <section className="overflow-hidden rounded-[34px] border border-stone-300/70 bg-[linear-gradient(135deg,#1f2430_0%,#2d3646_46%,#a57939_160%)] px-6 py-8 text-stone-50 shadow-[0_30px_90px_rgba(44,36,24,0.12)] md:px-10 md:py-12">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.36em] text-stone-300">
              Personal Knowledge Library
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-6xl">
              面向公开阅读的个人知识库，而不是普通时间流博客。
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-stone-200 md:text-lg">
              以知识库为入口，以目录树为骨架，以 Markdown 为内容源。访客无需登录，直接从知识集合进入具体文章。
            </p>
          </div>

          <div className="mt-8 max-w-3xl">
            <SearchForm />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[30px] border border-stone-300/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(249,246,240,0.9))] p-6 shadow-[0_30px_90px_rgba(44,36,24,0.08)] md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-stone-500">
                  Libraries
                </p>
                <h2 className="mt-3 text-3xl font-semibold">知识库集合</h2>
              </div>
              <p className="text-sm text-stone-500">
                当前共 {featuredLibraries.length} 个知识库
              </p>
            </div>

            <div className="mt-8 grid gap-5 xl:grid-cols-2" data-testid="library-grid">
              {featuredLibraries.map((library, index) => {
                const href = library.defaultSlug
                  ? `/kb/${library.slug}/${library.defaultSlug.join("/")}`
                  : `/kb/${library.slug}`;

                return (
                  <Link
                    key={library.slug}
                    href={href}
                    className="group relative overflow-hidden rounded-[28px] border border-stone-300/80 bg-white/80 p-6 transition duration-300 hover:-translate-y-1 hover:border-stone-500 hover:shadow-[0_24px_50px_rgba(44,36,24,0.10)]"
                  >
                    <div className="absolute right-4 top-4 rounded-full border border-stone-300 bg-stone-50 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-stone-500">
                      {index + 1}
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-stone-500">
                      {library.slug}
                    </p>
                    <h3 className="mt-4 text-2xl font-semibold leading-tight text-stone-900">
                      {library.name}
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-stone-600">
                      {library.description ?? "该知识库暂未提供摘要说明。"}
                    </p>

                    <div className="mt-8 flex flex-wrap gap-2 text-sm text-stone-500">
                      <span className="rounded-full border border-stone-300 bg-stone-50 px-3 py-1">
                        {library.articleCount} 篇文章
                      </span>
                      {library.updatedAt ? (
                        <span className="rounded-full border border-stone-300 bg-stone-50 px-3 py-1">
                          更新于 {library.updatedAt}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <aside className="rounded-[30px] border border-stone-300/70 bg-[#f6efe3] p-6 shadow-[0_30px_90px_rgba(44,36,24,0.08)] md:p-8">
            <p className="text-[11px] uppercase tracking-[0.32em] text-stone-500">
              Reading Mode
            </p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight">
              当前前台已进入“知识工作台”模式。
            </h2>
            <ul className="mt-6 space-y-4 text-sm leading-7 text-stone-600">
              <li>首页默认展示知识库集合，而不是普通文章流。</li>
              <li>知识库详情页使用左侧树结构进入具体文章。</li>
              <li>文章图片继续按同级 `resource` 目录读取。</li>
              <li>搜索页可直接检索单篇文章。</li>
            </ul>
          </aside>
        </section>
      </div>
    </main>
  );
}
