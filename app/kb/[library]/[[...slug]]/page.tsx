import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { KnowledgeBaseShell } from "@/components/knowledge-base-shell";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import {
  buildArticleHref,
  decodeRouteSegment,
  decodeRouteSegments,
} from "@/lib/content-paths";
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

function buildBreadcrumbs(
  libraryName: string,
  librarySlug: string,
  slugParts: string[],
) {
  const breadcrumbs = [
    {
      label: "知识库首页",
      href: "/",
    },
    {
      label: libraryName,
      href: `/kb/${encodeURIComponent(librarySlug)}`,
    },
  ];

  slugParts.forEach((segment, index) => {
    breadcrumbs.push({
      label: segment,
      href: buildArticleHref(librarySlug, slugParts.slice(0, index + 1)),
    });
  });

  return breadcrumbs;
}

export async function generateMetadata({
  params,
}: KnowledgeBasePageProps): Promise<Metadata> {
  const { library, slug } = await params;
  const decodedLibrary = decodeRouteSegment(library);
  const decodedSlug = slug ? decodeRouteSegments(slug) : undefined;
  const libraries = await listKnowledgeBases();
  const librarySummary = libraries.find((entry) => entry.slug === decodedLibrary);

  if (!librarySummary) {
    return {
      title: "知识库不存在",
    };
  }

  const finalSlug = decodedSlug ?? (await getDefaultArticleSlug(decodedLibrary));

  if (!finalSlug) {
    return {
      title: `${librarySummary.name} | 空知识库`,
      description: librarySummary.description ?? undefined,
    };
  }

  const article = await readArticle(decodedLibrary, finalSlug);
  return {
    title: `${article.title} | ${librarySummary.name}`,
    description: article.description ?? librarySummary.description ?? undefined,
  };
}

export default async function KnowledgeBaseArticlePage({
  params,
}: KnowledgeBasePageProps) {
  const { library, slug } = await params;
  const decodedLibrary = decodeRouteSegment(library);
  const decodedSlug = slug ? decodeRouteSegments(slug) : undefined;
  const libraries = await listKnowledgeBases();
  const librarySummary = libraries.find((entry) => entry.slug === decodedLibrary);

  if (!librarySummary) {
    notFound();
  }

  const finalSlug = decodedSlug ?? (await getDefaultArticleSlug(decodedLibrary));

  if (!finalSlug) {
    notFound();
  }

  let article;
  try {
    article = await readArticle(decodedLibrary, finalSlug);
  } catch {
    notFound();
  }

  const tree = await getKnowledgeBaseTree(decodedLibrary);
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
      articleHeadings={article.headings}
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
          headings={article.headings}
          title={article.title}
        />
      }
    />
  );
}
