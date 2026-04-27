import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { KnowledgeBaseShell } from "@/components/knowledge-base-shell";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import {
  getDefaultArticleSlug,
  getKnowledgeBaseTree,
  listKnowledgeBases,
  readArticle,
} from "@/lib/content";

type KnowledgeBasePageProps = {
  params: Promise<{
    library: string;
    slug?: string[];
  }>;
};

function buildBreadcrumbs(libraryName: string, librarySlug: string, slugParts: string[]) {
  const breadcrumbs = [
    {
      label: "知识库首页",
      href: "/",
    },
    {
      label: libraryName,
      href: `/kb/${librarySlug}`,
    },
  ];

  slugParts.forEach((segment, index) => {
    breadcrumbs.push({
      label: segment,
      href: `/kb/${librarySlug}/${slugParts.slice(0, index + 1).join("/")}`,
    });
  });

  return breadcrumbs;
}

export async function generateMetadata({
  params,
}: KnowledgeBasePageProps): Promise<Metadata> {
  const { library, slug } = await params;
  const libraries = await listKnowledgeBases();
  const librarySummary = libraries.find((entry) => entry.slug === library);

  if (!librarySummary) {
    return {
      title: "知识库不存在",
    };
  }

  const finalSlug = slug ?? (await getDefaultArticleSlug(library));

  if (!finalSlug) {
    return {
      title: `${librarySummary.name} | 空知识库`,
      description: librarySummary.description ?? undefined,
    };
  }

  const article = await readArticle(library, finalSlug);
  return {
    title: `${article.title} | ${librarySummary.name}`,
    description: article.description ?? librarySummary.description ?? undefined,
  };
}

export default async function KnowledgeBaseArticlePage({
  params,
}: KnowledgeBasePageProps) {
  const { library, slug } = await params;
  const libraries = await listKnowledgeBases();
  const librarySummary = libraries.find((entry) => entry.slug === library);

  if (!librarySummary) {
    notFound();
  }

  const finalSlug = slug ?? (await getDefaultArticleSlug(library));

  if (!finalSlug) {
    notFound();
  }

  let article;
  try {
    article = await readArticle(library, finalSlug);
  } catch {
    notFound();
  }

  const tree = await getKnowledgeBaseTree(library);
  const breadcrumbs = buildBreadcrumbs(
    librarySummary.name,
    librarySummary.slug,
    article.slugParts,
  );

  return (
    <KnowledgeBaseShell
      libraryName={librarySummary.name}
      librarySlug={librarySummary.slug}
      currentSlugParts={article.slugParts}
      breadcrumbs={breadcrumbs}
      tree={tree}
      articleTitle={article.title}
      articleMeta={
        <div className="flex flex-wrap items-center gap-3 text-sm text-stone-500">
          <span className="rounded-full border border-stone-300 bg-white/80 px-3 py-1">
            {librarySummary.slug}
          </span>
          <span className="rounded-full border border-stone-300 bg-white/80 px-3 py-1">
            {article.relativePath}
          </span>
          {article.updatedAt ? (
            <span className="rounded-full border border-stone-300 bg-white/80 px-3 py-1">
              更新于 {article.updatedAt}
            </span>
          ) : null}
        </div>
      }
      articleBody={
        <MarkdownRenderer
          markdown={article.body}
          resolvedImageSources={article.resolvedImageSources}
          title={article.title}
        />
      }
    />
  );
}
