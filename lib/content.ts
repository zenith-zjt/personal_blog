import { promises as fs, type Dirent } from "node:fs";
import path from "node:path";

import { buildArticleHref } from "@/lib/content-paths";

const CONTENT_ROOT = path.join(process.cwd(), "content");
const RESOURCE_DIR_NAME = "resource";
const ORDER_FILE_NAME = ".order.json";

type FrontmatterRecord = Record<string, string>;
type OrderBucket = "libraries" | "directories" | "articles" | "assets";

type OrderConfig = Partial<Record<OrderBucket, string[]>>;

export type TreeNodeType = "directory" | "article" | "resource" | "asset";
export type AdminSelectionKind =
  | "library"
  | "directory"
  | "article"
  | "resource"
  | "asset";
export type MoveDirection = "up" | "down";

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

export type ContentDirectoryOption = {
  value: string;
  label: string;
};

type ParsedMarkdown = {
  frontmatter: FrontmatterRecord;
  body: string;
};

type ScanResult = {
  tree: TreeNode[];
  articles: ArticleMeta[];
};

type UploadMarkdownInput = {
  targetDirectory: string;
  markdownFile: File;
};

type UploadResourceInput = {
  targetResourceDirectory: string;
  imageFiles: File[];
};

type CreateKnowledgeBaseInput = {
  libraryName: string;
};

type CreateContentDirectoryInput = {
  targetDirectory: string;
  directoryName: string;
};

type MoveContentNodeInput = {
  relativePath: string;
  nodeKind: Exclude<AdminSelectionKind, "resource">;
  direction?: MoveDirection;
  targetPath?: string;
};

function toPosixPath(...parts: string[]) {
  return parts.filter(Boolean).join("/").replace(/\\/g, "/");
}

function normalizeRelativePath(relativePath: string) {
  return relativePath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function splitRelativePath(relativePath: string) {
  return normalizeRelativePath(relativePath).split("/").filter(Boolean);
}

function getParentRelativePath(relativePath: string) {
  const parts = splitRelativePath(relativePath);
  return toPosixPath(...parts.slice(0, -1));
}

function getBaseName(relativePath: string) {
  const parts = splitRelativePath(relativePath);
  return parts.at(-1) ?? "";
}

function ensureWithinContentRoot(targetPath: string) {
  const resolvedRoot = path.resolve(CONTENT_ROOT);
  const resolvedTarget = path.resolve(targetPath);

  if (
    resolvedTarget !== resolvedRoot &&
    !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    throw new Error("目标路径越界。");
  }

  return resolvedTarget;
}

function ensureSafeFileName(fileName: string) {
  const normalized = path.basename(fileName).trim();

  if (!normalized || normalized === "." || normalized === "..") {
    throw new Error("文件名无效。");
  }

  if (normalized === ORDER_FILE_NAME) {
    throw new Error("文件名不可使用保留名。");
  }

  if (/[<>:"|?*]/.test(normalized)) {
    throw new Error(`文件名包含非法字符：${normalized}`);
  }

  return normalized;
}

function ensureSafeDirectoryName(directoryName: string) {
  const normalized = directoryName.trim();

  if (!normalized || normalized === "." || normalized === "..") {
    throw new Error("目录名无效。");
  }

  if (normalized === RESOURCE_DIR_NAME || normalized === ORDER_FILE_NAME) {
    throw new Error("目录名不可使用保留名。");
  }

  if (normalized.includes("/") || normalized.includes("\\")) {
    throw new Error("目录名不能包含路径分隔符。");
  }

  if (/[<>:"|?*]/.test(normalized)) {
    throw new Error(`目录名包含非法字符：${normalized}`);
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
    .find((line) => /^#{1,6}\s+/.test(line.trim()));

  return headingLine
    ? headingLine.replace(/^#{1,6}\s+/, "").trim()
    : fallback;
}

function extractHeadings(body: string) {
  return body
    .split(/\r?\n/)
    .filter((line) => /^#{1,6}\s+/.test(line.trim()))
    .map((line) => line.replace(/^#{1,6}\s+/, "").trim());
}

function uniqueNames(names: string[]) {
  return Array.from(new Set(names.filter(Boolean)));
}

function cleanupOrderConfig(config: OrderConfig): OrderConfig {
  const nextConfig: OrderConfig = {};

  (["libraries", "directories", "articles", "assets"] as const).forEach((key) => {
    const values = uniqueNames(config[key] ?? []);
    if (values.length > 0) {
      nextConfig[key] = values;
    }
  });

  return nextConfig;
}

async function readOrderConfig(directoryPath: string) {
  const orderPath = path.join(directoryPath, ORDER_FILE_NAME);

  try {
    const raw = await fs.readFile(orderPath, "utf8");
    const parsed = JSON.parse(raw) as OrderConfig;
    return cleanupOrderConfig(parsed);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return {} as OrderConfig;
    }

    return {} as OrderConfig;
  }
}

async function writeOrderConfig(directoryPath: string, config: OrderConfig) {
  const normalized = cleanupOrderConfig(config);
  const orderPath = path.join(directoryPath, ORDER_FILE_NAME);

  if (Object.keys(normalized).length === 0) {
    await fs.rm(orderPath, { force: true });
    return;
  }

  await fs.writeFile(orderPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
}

function sortNamesByOrder(names: string[], preferredOrder: string[] = []) {
  const indexMap = new Map(preferredOrder.map((name, index) => [name, index]));

  return [...names].sort((left, right) => {
    const leftIndex = indexMap.get(left);
    const rightIndex = indexMap.get(right);

    if (leftIndex !== undefined && rightIndex !== undefined) {
      return leftIndex - rightIndex;
    }

    if (leftIndex !== undefined) {
      return -1;
    }

    if (rightIndex !== undefined) {
      return 1;
    }

    return left.localeCompare(right, "zh-Hans-CN");
  });
}

async function ensurePathDoesNotExist(
  absolutePath: string,
  errorMessage: string,
) {
  try {
    await fs.access(absolutePath);
    throw new Error(errorMessage);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }
}

function createAssetUrl(
  librarySlug: string,
  articleDirParts: string[],
  resourcePath: string,
) {
  const normalized = resourcePath
    .replace(/^\.\/+/, "")
    .replace(/^resource\//, "");
  const segments = [
    "",
    "api",
    "assets",
    librarySlug,
    ...articleDirParts,
    RESOURCE_DIR_NAME,
  ];

  if (normalized.length > 0) {
    segments.push(...normalized.split("/").filter(Boolean));
  }

  return `/${toPosixPath(
    ...segments.map((segment) => encodeURIComponent(segment)),
  ).replace("/%2F", "/")}`;
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
    .replace(/\|/g, " ")
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

async function listRootLibraryDirectoryEntries() {
  await ensureContentRootExists();
  const entries = await fs.readdir(CONTENT_ROOT, { withFileTypes: true });

  return entries.filter(
    (entry) => entry.isDirectory() && entry.name !== RESOURCE_DIR_NAME,
  );
}

function orderRootLibraries(names: string[], preferredOrder?: string[]) {
  return sortNamesByOrder(names, preferredOrder);
}

function sortDirectoryEntries(
  entries: Dirent[],
  orderConfig: OrderConfig,
  isResourceDirectory: boolean,
) {
  const regularDirectories = entries.filter(
    (entry) =>
      entry.isDirectory() &&
      entry.name !== RESOURCE_DIR_NAME &&
      entry.name !== ORDER_FILE_NAME,
  );
  const resourceDirectories = entries.filter(
    (entry) => entry.isDirectory() && entry.name === RESOURCE_DIR_NAME,
  );
  const markdownFiles = entries.filter(
    (entry) =>
      entry.isFile() &&
      entry.name !== ORDER_FILE_NAME &&
      path.extname(entry.name).toLowerCase() === ".md",
  );
  const assetFiles = isResourceDirectory
    ? entries.filter(
        (entry) =>
          entry.isFile() &&
          entry.name !== ORDER_FILE_NAME &&
          path.extname(entry.name).toLowerCase() !== ".md",
      )
    : [];

  const sortedDirectories = sortNamesByOrder(
    regularDirectories.map((entry) => entry.name),
    orderConfig.directories,
  );
  const sortedMarkdownFiles = sortNamesByOrder(
    markdownFiles.map((entry) => entry.name),
    orderConfig.articles,
  );
  const sortedAssetFiles = sortNamesByOrder(
    assetFiles.map((entry) => entry.name),
    orderConfig.assets,
  );

  const entryMap = new Map(entries.map((entry) => [entry.name, entry]));

  return [
    ...sortedDirectories.map((name) => entryMap.get(name)).filter(Boolean),
    ...resourceDirectories.sort((left, right) =>
      left.name.localeCompare(right.name, "zh-Hans-CN"),
    ),
    ...sortedMarkdownFiles.map((name) => entryMap.get(name)).filter(Boolean),
    ...sortedAssetFiles.map((name) => entryMap.get(name)).filter(Boolean),
  ] as Dirent[];
}

async function scanKnowledgeBaseDirectory(
  librarySlug: string,
  absoluteDirPath: string,
  relativeDirParts: string[] = [],
): Promise<ScanResult> {
  const entries = await fs.readdir(absoluteDirPath, { withFileTypes: true });
  const orderConfig = await readOrderConfig(absoluteDirPath);
  const isResourceDirectory =
    path.basename(absoluteDirPath) === RESOURCE_DIR_NAME;
  const sortedEntries = sortDirectoryEntries(
    entries,
    orderConfig,
    isResourceDirectory,
  );

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

    if (!entry.isFile() || entry.name === ORDER_FILE_NAME) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();

    if (extension !== ".md") {
      if (isResourceDirectory) {
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
  const orderConfig = await readOrderConfig(absoluteDirPath);
  const directoryNames = sortNamesByOrder(
    entries
      .filter(
        (entry) => entry.isDirectory() && entry.name !== RESOURCE_DIR_NAME,
      )
      .map((entry) => entry.name),
    orderConfig.directories,
  );

  for (const directoryName of directoryNames) {
    const nextRelative = relativeDir
      ? `${relativeDir}/${directoryName}`
      : directoryName;

    options.push({
      value: nextRelative,
      label: nextRelative.replaceAll("/", " / "),
    });

    await collectDirectoryOptions(
      path.join(absoluteDirPath, directoryName),
      nextRelative,
      options,
    );
  }
}

function createDefaultOverviewMarkdown(libraryName: string) {
  const today = new Date().toISOString().slice(0, 10);

  return `---
title: ${libraryName}
description: 新建知识库默认首页
updatedAt: ${today}
---

# ${libraryName}

这是新建知识库的默认首页。你可以直接修改或删除这篇文章。
`;
}

async function appendOrderName(
  directoryPath: string,
  bucket: OrderBucket,
  name: string,
) {
  const current = await readOrderConfig(directoryPath);
  await writeOrderConfig(directoryPath, {
    ...current,
    [bucket]: [...(current[bucket] ?? []), name],
  });
}

async function removeOrderName(
  directoryPath: string,
  bucket: OrderBucket,
  name: string,
) {
  const current = await readOrderConfig(directoryPath);
  await writeOrderConfig(directoryPath, {
    ...current,
    [bucket]: (current[bucket] ?? []).filter((entry) => entry !== name),
  });
}

async function listSiblingNames(
  directoryPath: string,
  nodeKind: Exclude<AdminSelectionKind, "resource">,
) {
  if (nodeKind === "library") {
    const libraries = await listKnowledgeBases();
    return libraries.map((library) => library.slug);
  }

  const entries = await fs.readdir(directoryPath, { withFileTypes: true });

  if (nodeKind === "directory") {
    return entries
      .filter(
        (entry) => entry.isDirectory() && entry.name !== RESOURCE_DIR_NAME,
      )
      .map((entry) => entry.name);
  }

  if (nodeKind === "article") {
    return entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name !== ORDER_FILE_NAME &&
          path.extname(entry.name).toLowerCase() === ".md",
      )
      .map((entry) => entry.name);
  }

  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name !== ORDER_FILE_NAME &&
        path.extname(entry.name).toLowerCase() !== ".md",
    )
    .map((entry) => entry.name);
}

function getOrderBucketByKind(
  nodeKind: Exclude<AdminSelectionKind, "resource">,
): OrderBucket {
  if (nodeKind === "library") return "libraries";
  if (nodeKind === "directory") return "directories";
  if (nodeKind === "article") return "articles";
  return "assets";
}

function assertSortableNodeKind(
  nodeKind: AdminSelectionKind,
): asserts nodeKind is Exclude<AdminSelectionKind, "resource"> {
  if (nodeKind === "resource") {
    throw new Error("resource 目录不支持排序。");
  }
}

async function buildCurrentOrderedNames(
  directoryPath: string,
  nodeKind: Exclude<AdminSelectionKind, "resource">,
) {
  const bucket = getOrderBucketByKind(nodeKind);
  const current = await readOrderConfig(directoryPath);
  const siblings = await listSiblingNames(directoryPath, nodeKind);
  return sortNamesByOrder(siblings, current[bucket]);
}

async function writeOrderedNames(
  directoryPath: string,
  nodeKind: Exclude<AdminSelectionKind, "resource">,
  names: string[],
) {
  const bucket = getOrderBucketByKind(nodeKind);
  const current = await readOrderConfig(directoryPath);
  await writeOrderConfig(directoryPath, {
    ...current,
    [bucket]: uniqueNames(names),
  });
}

function resolveNodeLocation(
  relativePath: string,
  nodeKind: AdminSelectionKind,
) {
  const normalizedPath = normalizeRelativePath(relativePath);
  const parentRelativePath =
    nodeKind === "library" ? "" : getParentRelativePath(normalizedPath);
  const nodeName =
    nodeKind === "library" ? normalizedPath : getBaseName(normalizedPath);
  const parentAbsolutePath = ensureWithinContentRoot(
    path.join(CONTENT_ROOT, parentRelativePath),
  );
  const absolutePath = ensureWithinContentRoot(
    path.join(CONTENT_ROOT, normalizedPath),
  );

  return {
    normalizedPath,
    parentRelativePath,
    nodeName,
    parentAbsolutePath,
    absolutePath,
  };
}

async function removeKnowledgeBaseTree(relativePath: string) {
  const { normalizedPath, absolutePath } = resolveNodeLocation(
    relativePath,
    "library",
  );
  const stat = await fs.stat(absolutePath);

  if (!stat.isDirectory()) {
    throw new Error("当前知识库不存在。");
  }

  await fs.rm(absolutePath, { recursive: true, force: false });
  await removeOrderName(CONTENT_ROOT, "libraries", normalizedPath);
}

async function removeDirectoryTree(relativePath: string) {
  const { normalizedPath, nodeName, parentAbsolutePath, absolutePath } =
    resolveNodeLocation(relativePath, "directory");
  const stat = await fs.stat(absolutePath);

  if (!stat.isDirectory()) {
    throw new Error("当前目录不存在。");
  }

  await fs.rm(absolutePath, { recursive: true, force: false });
  await removeOrderName(parentAbsolutePath, "directories", nodeName);

  return normalizedPath;
}

async function removeResourceDirectory(relativePath: string) {
  const { absolutePath } = resolveNodeLocation(relativePath, "resource");
  const stat = await fs.stat(absolutePath);

  if (!stat.isDirectory()) {
    throw new Error("当前资源目录不存在。");
  }

  await fs.rm(absolutePath, { recursive: true, force: false });
}

export async function listKnowledgeBases() {
  await ensureContentRootExists();
  const entries = await listRootLibraryDirectoryEntries();
  const rootOrder = await readOrderConfig(CONTENT_ROOT);
  const orderedNames = orderRootLibraries(
    entries.map((entry) => entry.name),
    rootOrder.libraries,
  );
  const entryMap = new Map(entries.map((entry) => [entry.name, entry]));
  const libraries: KnowledgeBaseSummary[] = [];

  for (const libraryName of orderedNames) {
    const entry = entryMap.get(libraryName);
    if (!entry) {
      continue;
    }

    const libraryPath = path.join(CONTENT_ROOT, entry.name);
    const scan = await scanKnowledgeBaseDirectory(entry.name, libraryPath);

    if (scan.articles.length === 0) {
      continue;
    }

    const overview = scan.articles.find((article) =>
      ["overview", "intro", "index"].includes(
        article.slugParts.at(-1)?.toLowerCase() ?? "",
      ),
    );

    libraries.push({
      slug: entry.name,
      name: overview?.title ?? entry.name,
      description: overview?.description ?? null,
      articleCount: scan.articles.length,
      updatedAt: maxUpdatedAt(scan.articles.map((article) => article.updatedAt)),
      rootPath: entry.name,
    });
  }

  return libraries;
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
  return scan.articles;
}

export async function getDefaultArticleSlug(librarySlug: string) {
  const libraryRoot = ensureWithinContentRoot(path.join(CONTENT_ROOT, librarySlug));
  const entries = await fs.readdir(libraryRoot, { withFileTypes: true });
  const orderConfig = await readOrderConfig(libraryRoot);
  const rootMarkdownNames = sortNamesByOrder(
    entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name !== ORDER_FILE_NAME &&
          path.extname(entry.name).toLowerCase() === ".md",
      )
      .map((entry) => entry.name),
    orderConfig.articles,
  );

  if (rootMarkdownNames.length > 0) {
    return [path.basename(rootMarkdownNames[0], ".md")];
  }

  const articles = await getKnowledgeBaseArticleList(librarySlug);
  return articles[0]?.slugParts ?? null;
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
      if (titleText.includes(normalizedQuery)) score += 6;
      if (fileNameText.includes(normalizedQuery)) score += 5;
      if (libraryText.includes(normalizedQuery)) score += 3;
      if (pathText.includes(normalizedQuery)) score += 2;
      if (descriptionText.includes(normalizedQuery)) score += 2;
      if (bodyText.toLowerCase().includes(normalizedQuery)) score += 1;

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

export async function uploadMarkdownToDirectory({
  targetDirectory,
  markdownFile,
}: UploadMarkdownInput) {
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
  await fs.mkdir(writableRoot, { recursive: true });

  const markdownPath = ensureWithinContentRoot(path.join(writableRoot, markdownName));
  await ensurePathDoesNotExist(
    markdownPath,
    `目标目录中已存在同名文章：${markdownName}`,
  );

  const markdownBuffer = Buffer.from(await markdownFile.arrayBuffer());
  if (markdownBuffer.length === 0) {
    throw new Error("Markdown 文件不能为空。");
  }

  await fs.writeFile(markdownPath, markdownBuffer);
  await appendOrderName(writableRoot, "articles", markdownName);

  return {
    targetDirectory: normalizeRelativePath(targetDirectory),
    markdownName,
  };
}

export async function uploadImagesToResourceDirectory({
  targetResourceDirectory,
  imageFiles,
}: UploadResourceInput) {
  if (!targetResourceDirectory.trim()) {
    throw new Error("请选择资源目录。");
  }

  const normalizedTarget = normalizeRelativePath(targetResourceDirectory);
  if (
    !normalizedTarget.endsWith(`/${RESOURCE_DIR_NAME}`) &&
    normalizedTarget !== RESOURCE_DIR_NAME
  ) {
    throw new Error("图片只能上传到 resource 目录。");
  }

  if (imageFiles.length === 0) {
    throw new Error("请至少上传一张图片。");
  }

  const allowedImageExtensions = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
  ]);

  const resourceDirectory = ensureWithinContentRoot(
    path.join(CONTENT_ROOT, normalizedTarget),
  );
  await fs.mkdir(resourceDirectory, { recursive: true });

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

    const imagePath = ensureWithinContentRoot(path.join(resourceDirectory, imageName));
    await ensurePathDoesNotExist(
      imagePath,
      `资源目录中已存在同名图片：${imageName}`,
    );

    await fs.writeFile(imagePath, imageBuffer);
    await appendOrderName(resourceDirectory, "assets", imageName);
  }

  return {
    targetResourceDirectory: normalizedTarget,
    imageCount: imageFiles.length,
  };
}

export async function createKnowledgeBase({
  libraryName,
}: CreateKnowledgeBaseInput) {
  await ensureContentRootExists();

  const normalizedLibraryName = ensureSafeDirectoryName(libraryName);
  const libraryRoot = ensureWithinContentRoot(
    path.join(CONTENT_ROOT, normalizedLibraryName),
  );
  await ensurePathDoesNotExist(
    libraryRoot,
    `知识库已存在：${normalizedLibraryName}`,
  );

  await fs.mkdir(libraryRoot, { recursive: true });
  await fs.mkdir(path.join(libraryRoot, RESOURCE_DIR_NAME), { recursive: true });
  await fs.writeFile(
    path.join(libraryRoot, "overview.md"),
    createDefaultOverviewMarkdown(normalizedLibraryName),
    "utf8",
  );
  await appendOrderName(CONTENT_ROOT, "libraries", normalizedLibraryName);
  await appendOrderName(libraryRoot, "articles", "overview.md");

  return {
    librarySlug: normalizedLibraryName,
  };
}

export async function createContentDirectory({
  targetDirectory,
  directoryName,
}: CreateContentDirectoryInput) {
  if (!targetDirectory.trim()) {
    throw new Error("请选择父级目录。");
  }

  const normalizedTargetDirectory = normalizeRelativePath(targetDirectory);
  const normalizedDirectoryName = ensureSafeDirectoryName(directoryName);
  const parentDirectory = ensureWithinContentRoot(
    path.join(CONTENT_ROOT, normalizedTargetDirectory),
  );
  const nextDirectory = ensureWithinContentRoot(
    path.join(parentDirectory, normalizedDirectoryName),
  );

  await ensurePathDoesNotExist(
    nextDirectory,
    `目录已存在：${normalizedDirectoryName}`,
  );

  await fs.mkdir(nextDirectory, { recursive: true });
  await fs.mkdir(path.join(nextDirectory, RESOURCE_DIR_NAME), { recursive: true });
  await appendOrderName(parentDirectory, "directories", normalizedDirectoryName);

  return {
    directoryPath: toPosixPath(normalizedTargetDirectory, normalizedDirectoryName),
  };
}

export async function deleteContentFile(relativeFilePath: string) {
  return deleteContentNode(relativeFilePath, "article");
}

export async function deleteContentNode(
  relativePath: string,
  nodeKind: AdminSelectionKind,
) {
  const normalizedPath = normalizeRelativePath(relativePath);

  if (!normalizedPath) {
    throw new Error("缺少要删除的目标路径。");
  }

  if (nodeKind === "library") {
    await removeKnowledgeBaseTree(normalizedPath);
    return {
      relativePath: normalizedPath,
      parentPath: "",
    };
  }

  if (nodeKind === "directory") {
    const removedPath = await removeDirectoryTree(normalizedPath);
    return {
      relativePath: removedPath,
      parentPath: getParentRelativePath(removedPath),
    };
  }

  if (nodeKind === "resource") {
    await removeResourceDirectory(normalizedPath);
    return {
      relativePath: normalizedPath,
      parentPath: getParentRelativePath(normalizedPath),
    };
  }

  const { nodeName, parentRelativePath, parentAbsolutePath, absolutePath } =
    resolveNodeLocation(normalizedPath, nodeKind);
  const stat = await fs.stat(absolutePath);

  if (!stat.isFile()) {
    throw new Error("当前目标不是文件。");
  }

  await fs.unlink(absolutePath);
  await removeOrderName(
    parentAbsolutePath,
    getOrderBucketByKind(nodeKind),
    nodeName,
  );

  return {
    relativePath: normalizedPath,
    parentPath: parentRelativePath,
  };
}

export async function moveContentNode({
  relativePath,
  nodeKind,
  direction,
  targetPath,
}: MoveContentNodeInput) {
  assertSortableNodeKind(nodeKind);

  const source = resolveNodeLocation(relativePath, nodeKind);
  const siblings = await buildCurrentOrderedNames(source.parentAbsolutePath, nodeKind);
  const sourceIndex = siblings.indexOf(source.nodeName);

  if (sourceIndex === -1) {
    throw new Error("当前节点不存在于可排序列表中。");
  }

  let nextIndex = sourceIndex;

  if (targetPath) {
    const target = resolveNodeLocation(targetPath, nodeKind);

    if (target.parentRelativePath !== source.parentRelativePath) {
      throw new Error("只能在同一父级目录下拖动排序。");
    }

    const targetIndex = siblings.indexOf(target.nodeName);
    if (targetIndex === -1) {
      throw new Error("目标节点不存在。");
    }

    nextIndex = targetIndex;
  } else if (direction === "up") {
    nextIndex = Math.max(0, sourceIndex - 1);
  } else if (direction === "down") {
    nextIndex = Math.min(siblings.length - 1, sourceIndex + 1);
  } else {
    throw new Error("缺少排序方向。");
  }

  if (nextIndex === sourceIndex) {
    return {
      relativePath: source.normalizedPath,
      parentPath: source.parentRelativePath,
      changed: false,
    };
  }

  const reordered = [...siblings];
  const [current] = reordered.splice(sourceIndex, 1);
  reordered.splice(nextIndex, 0, current);

  await writeOrderedNames(source.parentAbsolutePath, nodeKind, reordered);

  return {
    relativePath: source.normalizedPath,
    parentPath: source.parentRelativePath,
    changed: true,
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
