"use client";

import { useActionState } from "react";

import {
  adminUploadMarkdownAction,
  adminUploadResourceImagesAction,
  type AdminUploadFormState,
} from "@/app/admin-archive-portal/actions";

const initialState: AdminUploadFormState = {
  message: "",
  success: false,
};

type AdminTreeUploadFormProps =
  | {
      mode: "directory";
      targetPath: string;
    }
  | {
      mode: "assets";
      targetPath: string;
    };

function FormFeedback({ state }: { state: AdminUploadFormState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={`rounded-2xl px-4 py-3 text-sm ${
        state.success
          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border border-red-200 bg-red-50 text-red-700"
      }`}
      role={state.success ? "status" : "alert"}
    >
      {state.message}
    </p>
  );
}

function MarkdownUploadForm({ targetPath }: { targetPath: string }) {
  const [state, action, pending] = useActionState(
    adminUploadMarkdownAction as (
      state: AdminUploadFormState,
      payload: FormData,
    ) => Promise<AdminUploadFormState>,
    initialState,
  );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="targetDirectory" value={targetPath} />

      <div className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-600">
        当前目标：
        <span className="ml-1 font-medium text-stone-900">{targetPath}</span>
      </div>

      <div className="space-y-2">
        <label htmlFor="markdown-file" className="text-sm text-stone-600">
          Markdown 文件
        </label>
        <input
          id="markdown-file"
          name="markdownFile"
          type="file"
          accept=".md,text/markdown"
          className="w-full rounded-2xl border border-stone-300 bg-white/90 px-4 py-3 text-sm text-stone-900"
        />
        <p className="text-xs leading-6 text-stone-500">
          普通目录只上传文章文件。选中文章后可在右侧直接上传该文章图片。
        </p>
      </div>

      <FormFeedback state={state} />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-stone-900 px-4 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-500"
      >
        {pending ? "处理中..." : "上传 Markdown 文章"}
      </button>
    </form>
  );
}

function AssetsUploadForm({ targetPath }: { targetPath: string }) {
  const [state, action, pending] = useActionState(
    adminUploadResourceImagesAction as (
      state: AdminUploadFormState,
      payload: FormData,
    ) => Promise<AdminUploadFormState>,
    initialState,
  );

  return (
    <form action={action} className="space-y-5">
      <input
        type="hidden"
        name="targetAssetsDirectory"
        value={targetPath}
      />

      <div className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-600">
        当前目标：
        <span className="ml-1 font-medium text-stone-900">{targetPath}</span>
      </div>

      <div className="space-y-2">
        <label htmlFor="image-files" className="text-sm text-stone-600">
          图片资源
        </label>
        <input
          id="image-files"
          name="imageFiles"
          type="file"
          accept=".png,.jpg,.jpeg,.gif,.webp,.svg,image/*"
          multiple
          className="w-full rounded-2xl border border-stone-300 bg-white/90 px-4 py-3 text-sm text-stone-900"
        />
        <p className="text-xs leading-6 text-stone-500">
          选中文章后支持多张图片上传，系统会自动写入该文章同级 `.assets` 目录。
        </p>
      </div>

      <FormFeedback state={state} />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-stone-900 px-4 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-500"
      >
        {pending ? "处理中..." : "上传图片资源"}
      </button>
    </form>
  );
}

export function AdminTreeUploadForm(props: AdminTreeUploadFormProps) {
  if (props.mode === "assets") {
    return <AssetsUploadForm targetPath={props.targetPath} />;
  }

  return <MarkdownUploadForm targetPath={props.targetPath} />;
}
