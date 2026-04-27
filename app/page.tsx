import { getDefaultArticleSlug, getStageOneSnapshot, readArticle } from "@/lib/content";
import Image from "next/image";

function TreeList({
  nodes,
}: {
  nodes: Awaited<ReturnType<typeof getStageOneSnapshot>>["libraries"][number]["tree"];
}) {
  return (
    <ul className="space-y-2 border-l border-stone-300/80 pl-4 text-sm text-stone-700">
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="flex items-center gap-2">
            <span className="text-stone-400">
              {node.type === "directory" ? "dir" : "md"}
            </span>
            <span>{node.name}</span>
          </div>
          {node.children && node.children.length > 0 ? (
            <div className="mt-2">
              <TreeList nodes={node.children} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default async function Home() {
  const snapshot = await getStageOneSnapshot();
  const firstLibrary = snapshot.libraries[0];
  const defaultArticleSlug = firstLibrary
    ? await getDefaultArticleSlug(firstLibrary.slug)
    : null;
  const previewArticle =
    firstLibrary && defaultArticleSlug
      ? await readArticle(firstLibrary.slug, defaultArticleSlug)
      : null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f2e7_0%,#f3efe6_48%,#ece7dc_100%)] px-6 py-10 text-stone-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:flex-row">
        <section className="w-full rounded-[28px] border border-stone-300/80 bg-white/85 p-8 shadow-[0_24px_80px_rgba(54,44,29,0.08)] backdrop-blur lg:w-[320px]">
          <p className="text-xs uppercase tracking-[0.35em] text-stone-500">
            Stage 1
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            内容域与文件系统能力
          </h1>
          <p className="mt-4 text-sm leading-7 text-stone-600">
            当前页面用于验证知识库扫描、树结构生成、文章读取与资源路径解析是否已经打通。
          </p>

          <div className="mt-8 space-y-4">
            {snapshot.libraries.map((library) => (
              <article
                key={library.slug}
                className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-base font-medium">{library.name}</h2>
                  <span className="rounded-full bg-stone-900 px-3 py-1 text-xs text-stone-50">
                    {library.articleCount} 篇
                  </span>
                </div>
                <p className="mt-2 text-sm text-stone-600">
                  {library.description ?? "未提供描述"}
                </p>
                <p className="mt-3 text-xs text-stone-500">
                  根目录：{library.rootPath}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid min-w-0 flex-1 gap-6 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
          <article className="rounded-[28px] border border-stone-300/80 bg-[#fbfaf7] p-8 shadow-[0_20px_60px_rgba(54,44,29,0.07)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">知识库树结构</h2>
              <span className="text-xs uppercase tracking-[0.28em] text-stone-500">
                resource 已隐藏
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              阶段 1 的前台树输出默认排除 `resource` 目录，但文章资源路径仍会解析到同级
              `resource`。
            </p>

            <div className="mt-8 space-y-6" data-testid="knowledge-base-tree">
              {snapshot.libraries.map((library) => (
                <section key={library.slug}>
                  <h3 className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-stone-500">
                    {library.slug}
                  </h3>
                  <TreeList nodes={library.tree} />
                </section>
              ))}
            </div>
          </article>

          <article className="rounded-[28px] border border-stone-300/80 bg-[#1f2430] p-8 text-stone-100 shadow-[0_20px_60px_rgba(54,44,29,0.12)]">
            <div className="flex flex-wrap items-center gap-3">
              <p className="rounded-full border border-stone-600 px-3 py-1 text-xs uppercase tracking-[0.28em] text-stone-300">
                文章读取样例
              </p>
              {previewArticle ? (
                <p className="text-sm text-stone-400">
                  {firstLibrary?.slug}/{previewArticle.relativePath}
                </p>
              ) : null}
            </div>

            {previewArticle ? (
              <>
                <h2 className="mt-6 text-3xl font-semibold leading-tight">
                  {previewArticle.title}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300">
                  {previewArticle.description ?? "当前文章未提供描述。"}
                </p>

                <div className="mt-8 grid gap-5 md:grid-cols-2">
                  <div className="rounded-2xl border border-stone-700 bg-white/5 p-5">
                    <h3 className="text-sm font-medium text-stone-100">解析结果</h3>
                    <ul className="mt-4 space-y-3 text-sm text-stone-300">
                      <li>文章相对路径：{previewArticle.relativePath}</li>
                      <li>资源基础路径：{previewArticle.assetBasePath}</li>
                      <li>标题层级数量：{previewArticle.headings.length}</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-stone-700 bg-white/5 p-5">
                    <h3 className="text-sm font-medium text-stone-100">图片解析</h3>
                    <ul className="mt-4 space-y-2 text-sm text-stone-300" data-testid="resolved-images">
                      {previewArticle.resolvedImageSources.map((imageSource) => (
                        <li key={imageSource} className="break-all">
                          {imageSource}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 overflow-hidden rounded-[24px] border border-stone-700 bg-white">
                  <Image
                    src={previewArticle.resolvedImageSources[0]}
                    alt="阶段一图片解析预览"
                    width={640}
                    height={280}
                    unoptimized
                    className="h-auto w-full"
                  />
                </div>

                <pre className="mt-8 overflow-x-auto rounded-[24px] border border-stone-700 bg-[#131720] p-5 text-xs leading-6 text-stone-300">
                  {previewArticle.body}
                </pre>
              </>
            ) : (
              <p className="mt-6 text-sm text-stone-300">
                当前没有可预览的示例文章。
              </p>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}
