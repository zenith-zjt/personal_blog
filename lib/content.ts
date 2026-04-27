import { promises as fs } from "node:fs";
import path from "node:path";

const CONTENT_ROOT = path.join(process.cwd(), "content");
const RESOURCE_DIR_NAME = "resource";

type FrontmatterRecord = Record<string, string>;

export type TreeNodeType = "directory" | "article" | "resource";

export type TreeNode = {
  id: string;
  name: string;
  type: TreeNodeType;
  path: string;
  visibleInFrontend: boolean;
  children?: TreeNode[];
};

export type ArticleMeta = {
  title: string;
  description: string | null;
  updatedAt: string | null;
  slugParts: string[];
  relativePath: string;
};

export type KnowledgeBaseSummary = {
  slug: string;
  name: string;
  description: string | null;
  articleCount: number;
  updatedAt: string | null;
  rootPath: string;
};

export type ArticleDocument = ArticleMeta & {
  body: string;
  headings: string[];
  assetBasePath: string;
  resolvedImageSources: string[];
};

type ParsedMarkdown = {
  frontmatter: FrontmatterRecord;
  body: string;
};

type ScanResult = {
  tree: TreeNode[];
  articles: ArticleMeta[];
};

function toPosixPath(...parts: string[]) {
  return parts.join("/").replace(/\\/g, "/");
}

function ensureWithinContentRoot(targetPath: string) {
  const resolvedRoot = path.resolve(CONTENT_ROOT);
  const resolvedTarget = path.resolve(targetPath);

  if (
    resolvedTarget !== resolvedRoot &&
    !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    throw new Error("Target path escapes the content root.");
  }

  return resolvedTarget;
}

async function ensureContentRootExists() {
  await fs.mkdir(CONTENT_ROOT, { recursive: true });
}

function parseMarkdownFile(markdown: string): ParsedMarkdown {
  if (!markdown.startsWith("---")) {
    return {
      frontmatter: {},
      body: markdown.trim(),
    };
  }

  const endIndex = markdown.indexOf("\n---", 3);

  if (endIndex === -1) {
    return {
      frontmatter: {},
      body: markdown.trim(),
    };
  }

  const frontmatterBlock = markdown.slice(3, endIndex).trim();
  const body = markdown.slice(endIndex + 4).trim();

  const frontmatter = frontmatterBlock
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<FrontmatterRecord>((accumulator, line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line
        .slice(separatorIndex + 1)
        .trim()
        .replace(/^['"]|['"]$/g, "");

      accumulator[key] = value;
      return accumulator;
    }, {});

  return {
    frontmatter,
    body,
  };
}

function titleFromMarkdownBody(body: string, fallback: string) {
  const headingLine = body
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith("# "));

  return headingLine ? headingLine.replace(/^#\s+/, "").trim() : fallback;
}

function extractHeadings(body: string) {
  return body
    .split(/\r?\n/)
    .filter((line) => /^#{1,6}\s+/.test(line.trim()))
    .map((line) => line.replace(/^#{1,6}\s+/, "").trim());
}

function createAssetUrl(librarySlug: string, articleDirParts: string[], resourcePath: string) {
  const normalized = resourcePath.replace(/^\.\/+/, "").replace(/^resource\//, "");
  const segments = ["", "api", "assets", librarySlug, ...articleDirParts, RESOURCE_DIR_NAME];

  if (normalized.length > 0) {
    segments.push(...normalized.split("/").filter(Boolean));
  }

  return encodeURI(toPosixPath(...segments));
}

export function resolveMarkdownAssetPath(
  librarySlug: string,
  articleDirParts: string[],
  rawPath: string,
) {
  if (
    rawPath.startsWith("http://") ||
    rawPath.startsWith("https://") ||
    rawPath.startsWith("data:") ||
    rawPath.startsWith("/")
  ) {
    return rawPath;
  }

  return createAssetUrl(librarySlug, articleDirParts, rawPath);
}

function extractResolvedImageSources(
  markdown: string,
  librarySlug: string,
  articleDirParts: string[],
) {
  const imagePattern = /!\[[^\]]*]\(([^)]+)\)/g;
  const matches = Array.from(markdown.matchAll(imagePattern));

  return matches.map((match) =>
    resolveMarkdownAssetPath(librarySlug, articleDirParts, match[1].trim()),
  );
}

async function scanKnowledgeBaseDirectory(
  librarySlug: string,
  absoluteDirPath: string,
  relativeDirParts: string[] = [],
): Promise<ScanResult> {
  const entries = await fs.readdir(absoluteDirPath, { withFileTypes: true });
  const sortedEntries = entries.sort((left, right) => {
    if (left.isDirectory() && !right.isDirectory()) {
      return -1;
    }

    if (!left.isDirectory() && right.isDirectory()) {
      return 1;
    }

    return left.name.localeCompare(right.name, "zh-Hans-CN");
  });

  const tree: TreeNode[] = [];
  const articles: ArticleMeta[] = [];

  for (const entry of sortedEntries) {
    const entryRelativeParts = [...relativeDirParts, entry.name];
    const entryRelativePath = toPosixPath(...entryRelativeParts);
    const absoluteEntryPath = path.join(absoluteDirPath, entry.name);

    if (entry.isDirectory()) {
      const type: TreeNodeType =
        entry.name === RESOURCE_DIR_NAME ? "resource" : "directory";
      const nested = await scanKnowledgeBaseDirectory(
        librarySlug,
        absoluteEntryPath,
        entryRelativeParts,
      );

      tree.push({
        id: `${librarySlug}:${entryRelativePath}`,
        name: entry.name,
        type,
        path: entryRelativePath,
        visibleInFrontend: type !== "resource",
        children: nested.tree,
      });
      articles.push(...nested.articles);
      continue;
    }

    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".md") {
      continue;
    }

    const rawMarkdown = await fs.readFile(absoluteEntryPath, "utf8");
    const parsed = parseMarkdownFile(rawMarkdown);
    const fileStem = path.basename(entry.name, ".md");
    const articleRelativeParts = [...relativeDirParts, fileStem];
    const articleMeta: ArticleMeta = {
      title: parsed.frontmatter.title ?? titleFromMarkdownBody(parsed.body, fileStem),
      description: parsed.frontmatter.description ?? null,
      updatedAt: parsed.frontmatter.updatedAt ?? null,
      slugParts: articleRelativeParts,
      relativePath: entryRelativePath,
    };

    tree.push({
      id: `${librarySlug}:${entryRelativePath}`,
      name: entry.name,
      type: "article",
      path: entryRelativePath,
      visibleInFrontend: true,
    });
    articles.push(articleMeta);
  }

  return {
    tree,
    articles,
  };
}

function filterFrontendTree(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .filter((node) => node.visibleInFrontend)
    .map((node) => ({
      ...node,
      children: node.children ? filterFrontendTree(node.children) : undefined,
    }));
}

function maxUpdatedAt(values: Array<string | null>) {
  const normalized = values.filter((value): value is string => Boolean(value));

  if (normalized.length === 0) {
    return null;
  }

  return normalized.sort().at(-1) ?? null;
}

export async function listKnowledgeBases() {
  await ensureContentRootExists();
  const entries = await fs.readdir(CONTENT_ROOT, { withFileTypes: true });

  const libraries = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const libraryPath = path.join(CONTENT_ROOT, entry.name);
        const scan = await scanKnowledgeBaseDirectory(entry.name, libraryPath);
        const overview = scan.articles.find((article) =>
          ["overview", "intro", "index"].includes(
            article.slugParts.at(-1)?.toLowerCase() ?? "",
          ),
        );

        const summary: KnowledgeBaseSummary = {
          slug: entry.name,
          name: overview?.title ?? entry.name,
          description: overview?.description ?? null,
          articleCount: scan.articles.length,
          updatedAt: maxUpdatedAt(scan.articles.map((article) => article.updatedAt)),
          rootPath: entry.name,
        };

        return summary;
      }),
  );

  return libraries.sort((left, right) => left.slug.localeCompare(right.slug, "zh-Hans-CN"));
}

export async function getKnowledgeBaseTree(
  librarySlug: string,
  options?: {
    includeResourceFolders?: boolean;
  },
) {
  await ensureContentRootExists();
  const libraryPath = ensureWithinContentRoot(path.join(CONTENT_ROOT, librarySlug));
  const scan = await scanKnowledgeBaseDirectory(librarySlug, libraryPath);

  return options?.includeResourceFolders ? scan.tree : filterFrontendTree(scan.tree);
}

export async function getKnowledgeBaseArticleList(librarySlug: string) {
  const libraryPath = ensureWithinContentRoot(path.join(CONTENT_ROOT, librarySlug));
  const scan = await scanKnowledgeBaseDirectory(librarySlug, libraryPath);
  return scan.articles.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath, "zh-Hans-CN"),
  );
}

export async function getDefaultArticleSlug(librarySlug: string) {
  const articles = await getKnowledgeBaseArticleList(librarySlug);
  const preferred =
    articles.find((article) =>
      ["overview", "intro", "index"].includes(
        article.slugParts.at(-1)?.toLowerCase() ?? "",
      ),
    ) ?? articles[0];

  return preferred?.slugParts ?? null;
}

export async function readArticle(
  librarySlug: string,
  slugParts: string[],
): Promise<ArticleDocument> {
  const normalizedSlug = slugParts.filter(Boolean);
  const absoluteMarkdownPath = ensureWithinContentRoot(
    path.join(CONTENT_ROOT, librarySlug, ...normalizedSlug) + ".md",
  );
  const rawMarkdown = await fs.readFile(absoluteMarkdownPath, "utf8");
  const parsed = parseMarkdownFile(rawMarkdown);
  const fileStem = normalizedSlug.at(-1) ?? librarySlug;
  const articleDirParts = normalizedSlug.slice(0, -1);

  return {
    title: parsed.frontmatter.title ?? titleFromMarkdownBody(parsed.body, fileStem),
    description: parsed.frontmatter.description ?? null,
    updatedAt: parsed.frontmatter.updatedAt ?? null,
    slugParts: normalizedSlug,
    relativePath: toPosixPath(...normalizedSlug) + ".md",
    body: parsed.body,
    headings: extractHeadings(parsed.body),
    assetBasePath: createAssetUrl(librarySlug, articleDirParts, ""),
    resolvedImageSources: extractResolvedImageSources(
      parsed.body,
      librarySlug,
      articleDirParts,
    ),
  };
}

export async function getStageOneSnapshot() {
  const libraries = await listKnowledgeBases();

  const librariesWithTrees = await Promise.all(
    libraries.map(async (library) => ({
      ...library,
      tree: await getKnowledgeBaseTree(library.slug),
    })),
  );

  return {
    contentRoot: CONTENT_ROOT,
    resourceDirectoryName: RESOURCE_DIR_NAME,
    libraries: librariesWithTrees,
  };
}

export async function readAssetFile(
  librarySlug: string,
  assetPathSegments: string[],
) {
  const relativeAssetPath = assetPathSegments.filter(Boolean);
  const absoluteAssetPath = ensureWithinContentRoot(
    path.join(CONTENT_ROOT, librarySlug, ...relativeAssetPath),
  );
  const normalized = relativeAssetPath.map((segment) => segment.toLowerCase());

  if (!normalized.includes(RESOURCE_DIR_NAME)) {
    throw new Error("Only assets under a resource directory can be served.");
  }

  const fileBuffer = await fs.readFile(absoluteAssetPath);
  return {
    fileBuffer,
    fileName: path.basename(absoluteAssetPath),
  };
}
