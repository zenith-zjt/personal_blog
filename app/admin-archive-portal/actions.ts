"use server";

import path from "node:path";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  clearAdminSession,
  clearAdminLoginFailures,
  createAdminSession,
  getAdminLoginRateLimit,
  recordAdminLoginFailure,
  requireAdminSession,
  verifyAdminCredentials,
} from "@/lib/admin-auth";
import { getAdminPath, getInternalAdminPath } from "@/lib/admin-paths";
import {
  updateAdminProfile,
  updateAdminSecurity,
  type AdminPublicProfile,
  type UploadedProfileFile,
} from "@/lib/admin-profile";
import {
  importBlogMigrationZip,
  importSystemBackupZip,
} from "@/lib/archive";
import {
  createContentDirectory,
  createKnowledgeBase,
  deleteContentNode,
  listKnowledgeBases,
  moveContentNode,
  type AdminSelectionKind,
  uploadImagesToResourceDirectory,
  uploadMarkdownToDirectory,
} from "@/lib/content";

export type AdminLoginFormState = {
  message?: string;
};

export type AdminUploadFormState = {
  message?: string;
  success?: boolean;
  redirectTo?: string;
};

export type AdminSettingsFormState = {
  message?: string;
  success?: boolean;
};

type TreeFlashStatus = "success" | "error";

type UploadedActionFile = UploadedProfileFile & {
  size?: number;
};

function isUploadedActionFile(value: unknown): value is UploadedActionFile {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    "arrayBuffer" in value &&
    typeof value.arrayBuffer === "function"
  );
}

function normalizeSelectionKind(kind: string | null | undefined): AdminSelectionKind {
  if (
    kind === "library" ||
    kind === "directory" ||
    kind === "article" ||
    kind === "assets" ||
    kind === "asset"
  ) {
    return kind;
  }

  return "directory";
}

function inferSelectionKind(relativePath: string): AdminSelectionKind {
  const normalized = relativePath.replace(/\\/g, "/").trim();

  if (!normalized.includes("/")) {
    return "library";
  }

  if (normalized.endsWith(".assets") || normalized.includes(".assets/")) {
    return normalized.endsWith(".assets") ? "assets" : "asset";
  }

  return path.extname(normalized).toLowerCase() === ".md" ? "article" : "asset";
}

export async function adminLoginAction(
  _state: AdminLoginFormState,
  formData: FormData,
) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const rateLimit = await getAdminLoginRateLimit(username);

  if (!rateLimit.allowed) {
    return {
      message: `登录尝试过多，请 ${rateLimit.retryAfterSeconds} 秒后再试。`,
    };
  }

  const verification = await verifyAdminCredentials(username, password);

  if (!verification.ok) {
    recordAdminLoginFailure(rateLimit.key);
    return {
      message: verification.message,
    };
  }

  clearAdminLoginFailures(rateLimit.key);
  await createAdminSession(verification.username);
  redirect(getAdminPath());
}

export async function adminUpdateSecurityAction(
  _state: AdminSettingsFormState,
  formData: FormData,
): Promise<AdminSettingsFormState> {
  await requireAdminSession();

  try {
    const result = await updateAdminSecurity({
      username: String(formData.get("username") ?? ""),
      currentPassword: String(formData.get("currentPassword") ?? ""),
      nextPassword: String(formData.get("nextPassword") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    });

    await createAdminSession(result.username);
    revalidateAdminAndPublicPaths();

    return {
      success: true,
      message: "安全信息已更新。",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "安全信息更新失败。",
    };
  }
}

export async function adminUpdateProfileAction(
  _state: AdminSettingsFormState,
  formData: FormData,
): Promise<AdminSettingsFormState> {
  await requireAdminSession();

  const techStack = String(formData.get("techStack") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  try {
    const avatarFile = formData.get("avatarFile");

    await updateAdminProfile(
      {
        displayName: String(formData.get("displayName") ?? ""),
        avatarUrl: String(formData.get("avatarUrl") ?? ""),
        roleLabel: String(formData.get("roleLabel") ?? ""),
        signature: String(formData.get("signature") ?? ""),
        profession: String(formData.get("profession") ?? ""),
        bio: String(formData.get("bio") ?? ""),
        techStack,
        githubUrl: String(formData.get("githubUrl") ?? ""),
        location: String(formData.get("location") ?? ""),
      } satisfies AdminPublicProfile,
      isUploadedActionFile(avatarFile) ? avatarFile : undefined,
    );

    revalidateAdminAndPublicPaths();

    return {
      success: true,
      message: "资料信息已更新。",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "资料信息更新失败。",
    };
  }
}

export async function adminImportSystemBackupAction(
  _state: AdminSettingsFormState,
  formData: FormData,
): Promise<AdminSettingsFormState> {
  await requireAdminSession();

  const backupFile = formData.get("backupFile");
  const overwrite = String(formData.get("overwrite") ?? "") === "true";

  if (!isUploadedActionFile(backupFile)) {
    return {
      success: false,
      message: "请上传系统备份 ZIP 文件。",
    };
  }

  try {
    const result = await importSystemBackupZip(
      Buffer.from(await backupFile.arrayBuffer()),
      overwrite,
    );

    revalidateAdminAndPublicPaths();

    return {
      success: true,
      message: `系统备份导入完成，共写入 ${result.fileCount} 个文件。`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "系统备份导入失败。",
    };
  }
}

export async function adminImportBlogMigrationAction(
  _state: AdminSettingsFormState,
  formData: FormData,
): Promise<AdminSettingsFormState> {
  await requireAdminSession();

  const migrationFile = formData.get("migrationFile");

  if (!isUploadedActionFile(migrationFile)) {
    return {
      success: false,
      message: "请上传博客迁移 ZIP 文件。",
    };
  }

  try {
    const result = await importBlogMigrationZip(
      Buffer.from(await migrationFile.arrayBuffer()),
    );

    revalidateAdminAndPublicPaths();

    return {
      success: true,
      message: `博客迁移导入完成，共写入 ${result.fileCount} 个有效文件。`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "博客迁移导入失败。",
    };
  }
}

function revalidateAdminAndPublicPaths() {
  revalidatePath("/");
  revalidatePath("/search");
  [
    getInternalAdminPath(),
    getInternalAdminPath("/settings"),
    getInternalAdminPath("/import-export"),
    getInternalAdminPath("/tree"),
    getInternalAdminPath("/upload"),
    getAdminPath(),
    getAdminPath("/settings"),
    getAdminPath("/import-export"),
    getAdminPath("/tree"),
    getAdminPath("/upload"),
  ].forEach((targetPath) => revalidatePath(targetPath));
}

function buildTreeRedirectUrl(
  options: {
    selected?: string;
    kind?: AdminSelectionKind;
    status?: TreeFlashStatus;
    message?: string;
  } = {},
) {
  const searchParams = new URLSearchParams();

  if (options.selected) {
    searchParams.set("selected", options.selected);
  }

  if (options.kind) {
    searchParams.set("kind", options.kind);
  }

  if (options.status) {
    searchParams.set("status", options.status);
  }

  if (options.message) {
    searchParams.set("message", options.message);
  }

  const query = searchParams.toString();
  return query
    ? `${getAdminPath("/tree")}?${query}`
    : getAdminPath("/tree");
}

async function buildFallbackTreeSelection(preferredPath?: string) {
  const libraries = await listKnowledgeBases();

  if (preferredPath) {
    const librarySlug = preferredPath.split("/")[0];
    if (libraries.some((library) => library.slug === librarySlug)) {
      return {
        selected: preferredPath,
        kind: preferredPath.endsWith(".assets")
          ? ("assets" as const)
          : preferredPath.includes("/")
            ? ("directory" as const)
            : ("library" as const),
      };
    }
  }

  const firstLibrary = libraries[0]?.slug;

  if (!firstLibrary) {
    return {
      selected: "",
      kind: "directory" as const,
    };
  }

  return {
    selected: firstLibrary,
    kind: "library" as const,
  };
}

export async function adminUploadMarkdownAction(
  _state: AdminUploadFormState,
  formData: FormData,
) {
  await requireAdminSession();

  const targetDirectory = String(formData.get("targetDirectory") ?? "").trim();
  const markdownFile = formData.get("markdownFile");

  if (!(markdownFile instanceof File) || !markdownFile.name) {
    return {
      success: false,
      message: "请上传 Markdown 文章文件。",
    };
  }

  try {
    const result = await uploadMarkdownToDirectory({
      targetDirectory,
      markdownFile,
    });

    revalidateAdminAndPublicPaths();
    revalidatePath(`/kb/${result.targetDirectory.split("/")[0]}`);

    return {
      success: true,
      message: `文章上传成功：${result.markdownName}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "上传失败，请稍后重试。",
    };
  }
}

export async function adminUploadResourceImagesAction(
  _state: AdminUploadFormState,
  formData: FormData,
) {
  await requireAdminSession();

  const targetAssetsDirectory = String(
    formData.get("targetAssetsDirectory") ??
      formData.get("targetResourceDirectory") ??
      "",
  ).trim();
  const imageEntries = formData.getAll("imageFiles");
  const imageFiles = imageEntries.filter(
    (entry): entry is File => entry instanceof File && Boolean(entry.name),
  );

  if (imageFiles.length === 0) {
    return {
      success: false,
      message: "请至少上传一张图片。",
    };
  }

  try {
    const result = await uploadImagesToResourceDirectory({
      targetAssetsDirectory,
      imageFiles,
    });

    revalidateAdminAndPublicPaths();
    revalidatePath(`/kb/${result.targetAssetsDirectory.split("/")[0]}`);

    return {
      success: true,
      message: `图片上传成功：${result.imageCount} 张`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "上传失败，请稍后重试。",
    };
  }
}

export async function adminCreateKnowledgeBaseAction(
  _state: AdminUploadFormState,
  formData: FormData,
) {
  await requireAdminSession();

  const libraryName = String(formData.get("libraryName") ?? "").trim();

  try {
    const result = await createKnowledgeBase({ libraryName });

    revalidateAdminAndPublicPaths();
    revalidatePath(`/kb/${result.librarySlug}`);
    return {
      success: true,
      redirectTo: buildTreeRedirectUrl({
        selected: result.librarySlug,
        kind: "library",
        status: "success",
        message: "知识库创建成功。",
      }),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "创建知识库失败，请稍后重试。",
    };
  }
}

export async function adminCreateDirectoryAction(
  _state: AdminUploadFormState,
  formData: FormData,
) {
  await requireAdminSession();

  const targetDirectory = String(formData.get("targetDirectory") ?? "").trim();
  const directoryName = String(formData.get("directoryName") ?? "").trim();

  try {
    const result = await createContentDirectory({
      targetDirectory,
      directoryName,
    });

    revalidateAdminAndPublicPaths();
    revalidatePath(`/kb/${result.directoryPath.split("/")[0]}`);
    return {
      success: true,
      redirectTo: buildTreeRedirectUrl({
        selected: result.directoryPath,
        kind: "directory",
        status: "success",
        message: "文件夹创建成功。",
      }),
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "创建目录失败，请稍后重试。",
    };
  }
}

export async function adminMoveTreeNodeAction(
  _state: AdminUploadFormState,
  formData: FormData,
) {
  await requireAdminSession();

  const relativePath = String(formData.get("relativePath") ?? "").trim();
  const targetPath = String(formData.get("targetPath") ?? "").trim();
  const direction = String(formData.get("direction") ?? "").trim();
  const nodeKind = normalizeSelectionKind(String(formData.get("nodeKind") ?? ""));
  const targetKind = normalizeSelectionKind(String(formData.get("targetKind") ?? ""));

  if (nodeKind === "assets") {
    return {
      success: false,
      message: "文章资源目录不支持排序。",
    };
  }

  try {
    const result = await moveContentNode({
      relativePath,
      nodeKind,
      targetPath: targetPath || undefined,
      targetKind: targetPath ? targetKind : undefined,
      direction:
        direction === "up" || direction === "down" ? direction : undefined,
    });

    revalidateAdminAndPublicPaths();
    const librarySlug = result.relativePath.split("/")[0];
    if (librarySlug) {
      revalidatePath(`/kb/${librarySlug}`);
    }

    return {
      success: true,
      redirectTo: buildTreeRedirectUrl({
        selected: result.relativePath,
        kind: nodeKind,
        status: "success",
        message: result.changed ? "排序已更新。" : "当前位置无需移动。",
      }),
    };
  } catch (error) {
    return {
      success: true,
      redirectTo: buildTreeRedirectUrl({
        selected: relativePath,
        kind: nodeKind,
        status: "error",
        message: error instanceof Error ? error.message : "排序失败，请稍后重试。",
      }),
    };
  }
}

export async function adminDeleteSelectedNodeAction(
  _state: AdminUploadFormState,
  formData: FormData,
) {
  await requireAdminSession();

  const relativePath = String(formData.get("relativePath") ?? "").trim();
  const nodeKind = normalizeSelectionKind(String(formData.get("nodeKind") ?? ""));

  try {
    const result = await deleteContentNode(relativePath, nodeKind);

    revalidateAdminAndPublicPaths();
    const librarySlug = result.relativePath.split("/")[0];
    if (librarySlug) {
      revalidatePath(`/kb/${librarySlug}`);
    }

    const fallback = await buildFallbackTreeSelection(
      result.parentPath || librarySlug,
    );

    return {
      success: true,
      redirectTo: buildTreeRedirectUrl({
        selected: fallback.selected,
        kind: fallback.kind,
        status: "success",
        message: "删除成功。",
      }),
    };
  } catch (error) {
    return {
      success: true,
      redirectTo: buildTreeRedirectUrl({
        selected: relativePath,
        kind: nodeKind,
        status: "error",
        message: error instanceof Error ? error.message : "删除失败，请稍后重试。",
      }),
    };
  }
}

export async function adminDeleteContentNodeAction(formData: FormData) {
  await requireAdminSession();

  const relativeFilePath = String(formData.get("relativeFilePath") ?? "").trim();
  const nodeKind = inferSelectionKind(relativeFilePath);
  try {
    const result = await deleteContentNode(relativeFilePath, nodeKind);

    revalidateAdminAndPublicPaths();
    const librarySlug = result.relativePath.split("/")[0];
    if (librarySlug) {
      revalidatePath(`/kb/${librarySlug}`);
    }

    const fallback = await buildFallbackTreeSelection(
      result.parentPath || librarySlug,
    );

    redirect(
      buildTreeRedirectUrl({
        selected: fallback.selected,
        kind: fallback.kind,
        status: "success",
        message: "删除成功。",
      }),
    );
  } catch (error) {
    redirect(
      buildTreeRedirectUrl({
        selected: relativeFilePath,
        kind: nodeKind,
        status: "error",
        message: error instanceof Error ? error.message : "删除失败，请稍后重试。",
      }),
    );
  }
}

export async function adminLogoutAction() {
  await clearAdminSession();
  redirect(getAdminPath("/login"));
}
