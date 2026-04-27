"use server";

import path from "node:path";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  clearAdminSession,
  createAdminSession,
  requireAdminSession,
  verifyAdminCredentials,
} from "@/lib/admin-auth";
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

type TreeFlashStatus = "success" | "error";

function normalizeSelectionKind(kind: string | null | undefined): AdminSelectionKind {
  if (
    kind === "library" ||
    kind === "directory" ||
    kind === "article" ||
    kind === "resource" ||
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

  if (normalized.endsWith("/resource")) {
    return "resource";
  }

  return path.extname(normalized).toLowerCase() === ".md" ? "article" : "asset";
}

export async function adminLoginAction(
  _state: AdminLoginFormState,
  formData: FormData,
) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const verification = verifyAdminCredentials(username, password);

  if (!verification.ok) {
    return {
      message: verification.message,
    };
  }

  await createAdminSession(verification.username);
  redirect("/admin-archive-portal");
}

function revalidateAdminAndPublicPaths() {
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/admin-archive-portal");
  revalidatePath("/admin-archive-portal/tree");
  revalidatePath("/admin-archive-portal/upload");
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
    ? `/admin-archive-portal/tree?${query}`
    : "/admin-archive-portal/tree";
}

async function buildFallbackTreeSelection(preferredPath?: string) {
  const libraries = await listKnowledgeBases();

  if (preferredPath) {
    const librarySlug = preferredPath.split("/")[0];
    if (libraries.some((library) => library.slug === librarySlug)) {
      return {
        selected: preferredPath,
        kind: preferredPath.endsWith("/resource")
          ? ("resource" as const)
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

  const targetResourceDirectory = String(
    formData.get("targetResourceDirectory") ?? "",
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
      targetResourceDirectory,
      imageFiles,
    });

    revalidateAdminAndPublicPaths();
    revalidatePath(`/kb/${result.targetResourceDirectory.split("/")[0]}`);

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

  if (nodeKind === "resource") {
    return {
      success: false,
      message: "resource 目录不支持排序。",
    };
  }

  try {
    const result = await moveContentNode({
      relativePath,
      nodeKind,
      targetPath: targetPath || undefined,
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
  redirect("/admin-archive-portal/login");
}
