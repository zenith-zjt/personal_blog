"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  clearAdminSession,
  createAdminSession,
  requireAdminSession,
  verifyAdminCredentials,
} from "@/lib/admin-auth";
import { uploadArticleFiles } from "@/lib/content";

export type AdminLoginFormState = {
  message?: string;
};

export type AdminUploadFormState = {
  message?: string;
  success?: boolean;
};

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

export async function adminUploadArticleAction(
  _state: AdminUploadFormState,
  formData: FormData,
) {
  await requireAdminSession();

  const targetDirectory = String(formData.get("targetDirectory") ?? "").trim();
  const markdownFile = formData.get("markdownFile");
  const imageEntries = formData.getAll("imageFiles");

  if (!(markdownFile instanceof File) || !markdownFile.name) {
    return {
      success: false,
      message: "请上传 Markdown 文章文件。",
    };
  }

  const imageFiles = imageEntries.filter(
    (entry): entry is File => entry instanceof File && Boolean(entry.name),
  );

  try {
    const result = await uploadArticleFiles({
      targetDirectory,
      markdownFile,
      imageFiles,
    });

    revalidatePath("/");
    revalidatePath("/search");
    revalidatePath("/admin-archive-portal/tree");
    revalidatePath(`/kb/${result.targetDirectory.split("/")[0]}`);

    return {
      success: true,
      message: `上传成功：${result.markdownName}，图片 ${result.imageCount} 张。`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "上传失败，请稍后重试。",
    };
  }
}

export async function adminLogoutAction() {
  await clearAdminSession();
  redirect("/admin-archive-portal/login");
}
