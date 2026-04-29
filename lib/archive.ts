import { promises as fs } from "node:fs";
import path from "node:path";

import { createZip, readZip, type ZipEntry } from "@/lib/zip";
import {
  ensureAdminAccountFile,
  getDataResourceRoot,
  validateAdminAccountConfig,
} from "@/lib/admin-profile";

const DATA_ROOT = path.join(process.cwd(), "data");
const CONTENT_ROOT = path.join(process.cwd(), "content");
const ORDER_FILE_NAMES = new Set([".order.json", "order.json"]);
const ALLOWED_IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
]);

function toPosixPath(...segments: string[]) {
  return segments.filter(Boolean).join("/").replace(/\\/g, "/");
}

function assertInsideRoot(root: string, target: string) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);

  if (
    resolvedTarget !== resolvedRoot &&
    !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    throw new Error("目标路径越界。");
  }

  return resolvedTarget;
}

function normalizeArchiveEntryName(name: string) {
  const normalized = name.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean);

  if (
    !normalized ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.includes("\0") ||
    segments.some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error(`压缩包中包含非法路径：${name}`);
  }

  return segments.join("/");
}

async function directoryHasFiles(directoryPath: string) {
  try {
    const entries = await fs.readdir(directoryPath);
    return entries.length > 0;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }

    throw error;
  }
}

async function collectFiles(root: string, current = ""): Promise<ZipEntry[]> {
  const absoluteDirectory = assertInsideRoot(root, path.join(root, current));

  let entries;
  try {
    entries = await fs.readdir(absoluteDirectory, { withFileTypes: true });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }

  const files: ZipEntry[] = [];

  for (const entry of entries) {
    const relativePath = toPosixPath(current, entry.name);
    const absolutePath = assertInsideRoot(root, path.join(root, relativePath));

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(root, relativePath)));
      continue;
    }

    if (entry.isFile()) {
      files.push({
        name: relativePath,
        data: await fs.readFile(absolutePath),
      });
    }
  }

  return files;
}

function isImageFile(entryName: string) {
  return ALLOWED_IMAGE_EXTENSIONS.has(path.extname(entryName).toLowerCase());
}

function isArticleAssetsEntry(entryName: string) {
  return entryName
    .split("/")
    .some((segment) => segment.toLowerCase().endsWith(".assets"));
}

function isAllowedBlogMigrationEntry(entryName: string) {
  const baseName = path.posix.basename(entryName);

  if (isArticleAssetsEntry(entryName)) {
    return isImageFile(entryName);
  }

  return path.posix.extname(entryName).toLowerCase() === ".md" ||
    ORDER_FILE_NAMES.has(baseName);
}

function validateSystemBackupEntries(entries: ZipEntry[]) {
  const accountEntry = entries.find((entry) => entry.name === "admin-account.json");

  if (!accountEntry) {
    throw new Error("系统备份缺少 admin-account.json 配置文件。");
  }

  try {
    validateAdminAccountConfig(JSON.parse(accountEntry.data.toString("utf8")));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("admin-account.json 不是合法 JSON。");
    }

    throw error;
  }
}

async function writeEntries(root: string, entries: ZipEntry[]) {
  for (const entry of entries) {
    const entryName = normalizeArchiveEntryName(entry.name);
    const absolutePath = assertInsideRoot(root, path.join(root, entryName));

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, entry.data);
  }
}

export async function createSystemBackupZip() {
  await ensureAdminAccountFile();
  await fs.mkdir(getDataResourceRoot(), { recursive: true });
  return createZip(await collectFiles(DATA_ROOT));
}

export async function createBlogMigrationZip() {
  return createZip(await collectFiles(CONTENT_ROOT));
}

export async function importSystemBackupZip(buffer: Buffer, overwrite: boolean) {
  const entries = readZip(buffer).map((entry) => ({
    ...entry,
    name: normalizeArchiveEntryName(entry.name),
  }));

  validateSystemBackupEntries(entries);

  if (!overwrite && (await directoryHasFiles(DATA_ROOT))) {
    throw new Error("data 目录已存在文件，请确认覆盖后再导入。");
  }

  await writeEntries(DATA_ROOT, entries);

  return {
    fileCount: entries.length,
  };
}

export async function importBlogMigrationZip(buffer: Buffer) {
  const entries = readZip(buffer)
    .map((entry) => ({
      ...entry,
      name: normalizeArchiveEntryName(entry.name),
    }))
    .filter((entry) => isAllowedBlogMigrationEntry(entry.name));

  await writeEntries(CONTENT_ROOT, entries);

  return {
    fileCount: entries.length,
  };
}

export function getProfileAssetContentType(relativePath: string) {
  const extension = path.extname(relativePath).toLowerCase();

  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".gif") return "image/gif";
  if (extension === ".webp") return "image/webp";

  throw new Error("不支持的图片格式。");
}

export async function readProfileAsset(relativePath: string) {
  const entryName = normalizeArchiveEntryName(relativePath);

  if (!entryName.startsWith("resource/") || !isImageFile(entryName)) {
    throw new Error("头像资源路径非法。");
  }

  const absolutePath = assertInsideRoot(DATA_ROOT, path.join(DATA_ROOT, entryName));
  return {
    data: await fs.readFile(absolutePath),
    contentType: getProfileAssetContentType(entryName),
  };
}
