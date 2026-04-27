import { promises as fs } from "node:fs";
import path from "node:path";

const CONTENT_ROOT = path.join(process.cwd(), "content");
const RESOURCE_DIR_NAME = "resource";

type FrontmatterRecord = Record<string, string>;

export type TreeNodeType = "directory" | "article" | "resource" | "asset";

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

export type SearchResult = {
  id: string;
  title: string;
  description: string | null;
  excerpt: string;
  librarySlug: string;
  libraryName: string;
  relativePath: string;
  slugParts: string[];
  href: string;
  fileName: string;
  updatedAt: string | null;
  score: number;
};

type ParsedMarkdown = {
  frontmatter: FrontmatterRecord;
  body: string;
};

type ScanResult = {
  tree: TreeNode[];
  articles: ArticleMeta[];
};

export type ContentDirectoryOption = {
  value: string;
  label: string;
};

export type UploadArticleInput = {
  targetDirectory: string;
  markdownFile: File;
  imageFiles: File[];
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

function ensureSafeFileName(fileName: string) {
  const normalized = path.basename(fileName).trim();

  if (!normalized || normalized === "." || normalized === "..") {
    throw new Error("文件名无效。");
  }

  if (/[<>:"|?*]/.test(normalized)) {
    throw new Error(`文件名包含非法字符：${normalized}`);
  }

  return normalized;
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

function createAssetUrl(
  librarySlug: string,
  articleDirParts: string[],
  resourcePath: string,
) {
  const normalized = resourcePath.replace(/^\.\/+/, "").replace(/^resource\//, "");
  const segments = ["", "api", "assets", librarySlug, ...articleDirParts, RESOURCE_DIR_NAME];

  if (normalized.length > 0) {
    segments.push(...normalized.split("/").filter(Boolean));
  }

  return encodeURI(toPosixPath(...segments));
}

export function buildArticleHref(librarySlug: string, slugParts: string[]) {
  return `/kb/${librarySlug}/${slugParts.join("/")}`;
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

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[[^\]]+]\([^)]+\)/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createExcerpt(text: string, query: string) {
  const normalizedText = stripMarkdown(text);
  if (!normalizedText) {
    return "";
  }

  const lowerText = normalizedText.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);

  if (matchIndex === -1) {
    return normalizedText.slice(0, 140);
  }

  const start = Math.max(0, matchIndex - 36);
  const end = Math.min(normalizedText.length, matchIndex + query.length + 72);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < normalizedText.length ? "..." : "";

  return `${prefix}${normalizedText.slice(start, end)}${suffix}`;
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

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();

    if (extension !== ".md") {
      const isResourceAsset = relativeDirParts.includes(RESOURCE_DIR_NAME);

      if (isResourceAsset) {
        tree.push({
          id: `${librarySlug}:${entryRelativePath}`,
          name: entry.name,
          type: "asset",
          path: entryRelativePath,
          visibleInFrontend: false,
        });
      }

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

async function collectDirectoryOptions(
  absoluteDirPath: string,
  relativeDir: string,
  options: ContentDirectoryOption[],
) {
  const entries = await fs.readdir(absoluteDirPath, { withFileTypes: true });
  const directories = entries
    .filter(
      (entry) =>
        entry.isDirectory() && entry.name !== RESOURCE_DIR_NAME,
    )
    .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"));

  for (const directory of directories) {
    const nextRelative = relativeDir
      ? `${relativeDir}/${directory.name}`
      : directory.name;

    options.push({
      value: nextRelative,
      label: nextRelative.replaceAll("/", " / "),
    });

    await collectDirectoryOptions(
      path.join(absoluteDirPath, directory.name),
      nextRelative,
      options,
    );
  }
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

  return libraries.sort((left, right) =>
    left.slug.localeCompare(right.slug, "zh-Hans-CN"),
  );
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

export async function getAdminKnowledgeBaseTrees() {
  const libraries = await listKnowledgeBases();

  return Promise.all(
    libraries.map(async (library) => ({
      ...library,
      tree: await getKnowledgeBaseTree(library.slug, {
        includeResourceFolders: true,
      }),
    })),
  );
}

export async function listContentDirectoryOptions() {
  await ensureContentRootExists();
  const libraries = await listKnowledgeBases();
  const options: ContentDirectoryOption[] = [];

  for (const library of libraries) {
    options.push({
      value: library.slug,
      label: library.slug,
    });

    await collectDirectoryOptions(
      path.join(CONTENT_ROOT, library.slug),
      library.slug,
      options,
    );
  }

  return options;
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

export async function searchArticles(query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [] as SearchResult[];
  }

  const libraries = await listKnowledgeBases();
  const results: SearchResult[] = [];

  for (const library of libraries) {
    const articles = await getKnowledgeBaseArticleList(library.slug);

    for (const articleMeta of articles) {
      const article = await readArticle(library.slug, articleMeta.slugParts);
      const fileName = path.basename(article.relativePath, ".md");
      const bodyText = stripMarkdown(article.body);
      const titleText = article.title.toLowerCase();
      const descriptionText = (article.description ?? "").toLowerCase();
      const pathText = article.relativePath.toLowerCase();
      const libraryText = `${library.slug} ${library.name}`.toLowerCase();
      const fileNameText = fileName.toLowerCase();

      const haystack = [
        titleText,
        descriptionText,
        pathText,
        libraryText,
        fileNameText,
        bodyText.toLowerCase(),
      ].join(" ");

      if (!haystack.includes(normalizedQuery)) {
        continue;
      }

      let score = 0;
      if (titleText.includes(normalizedQuery)) {
        score += 6;
      }
      if (fileNameText.includes(normalizedQuery)) {
        score += 5;
      }
      if (libraryText.includes(normalizedQuery)) {
        score += 3;
      }
      if (pathText.includes(normalizedQuery)) {
        score += 2;
      }
      if (descriptionText.includes(normalizedQuery)) {
        score += 2;
      }
      if (bodyText.toLowerCase().includes(normalizedQuery)) {
        score += 1;
      }

      results.push({
        id: `${library.slug}:${article.relativePath}`,
        title: article.title,
        description: article.description,
        excerpt: createExcerpt(article.body, normalizedQuery),
        librarySlug: library.slug,
        libraryName: library.name,
        relativePath: article.relativePath,
        slugParts: article.slugParts,
        href: buildArticleHref(library.slug, article.slugParts),
        fileName,
        updatedAt: article.updatedAt,
        score,
      });
    }
  }

  return results.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if ((right.updatedAt ?? "") !== (left.updatedAt ?? "")) {
      return (right.updatedAt ?? "").localeCompare(left.updatedAt ?? "");
    }

    return left.relativePath.localeCompare(right.relativePath, "zh-Hans-CN");
  });
}

export async function uploadArticleFiles({
  targetDirectory,
  markdownFile,
  imageFiles,
}: UploadArticleInput) {
  if (!targetDirectory.trim()) {
    throw new Error("请选择目标目录。");
  }

  const markdownName = ensureSafeFileName(markdownFile.name);
  if (path.extname(markdownName).toLowerCase() !== ".md") {
    throw new Error("文章文件必须是 .md 格式。");
  }

  const writableRoot = ensureWithinContentRoot(
    path.join(CONTENT_ROOT, targetDirectory),
  );

  const markdownBuffer = Buffer.from(await markdownFile.arrayBuffer());
  if (markdownBuffer.length === 0) {
    throw new Error("Markdown 文件不能为空。");
  }

  await fs.mkdir(writableRoot, { recursive: true });

  const markdownPath = ensureWithinContentRoot(path.join(writableRoot, markdownName));

  try {
    await fs.access(markdownPath);
    throw new Error(`目标目录中已存在同名文章：${markdownName}`);
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  await fs.writeFile(markdownPath, markdownBuffer);

  const allowedImageExtensions = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
  ]);

  const resourceDir = path.join(writableRoot, RESOURCE_DIR_NAME);

  if (imageFiles.length > 0) {
    await fs.mkdir(resourceDir, { recursive: true });
  }

  for (const imageFile of imageFiles) {
    const imageName = ensureSafeFileName(imageFile.name);
    const imageExtension = path.extname(imageName).toLowerCase();

    if (!allowedImageExtensions.has(imageExtension)) {
      throw new Error(`不支持的图片格式：${imageName}`);
    }

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    if (imageBuffer.length === 0) {
      throw new Error(`图片文件不能为空：${imageName}`);
    }

    const imagePath = ensureWithinContentRoot(path.join(resourceDir, imageName));

    try {
      await fs.access(imagePath);
      throw new Error(`资源目录中已存在同名图片：${imageName}`);
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
        throw error;
      }
    }

    await fs.writeFile(imagePath, imageBuffer);
  }

  return {
    markdownName,
    imageCount: imageFiles.length,
    targetDirectory,
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
