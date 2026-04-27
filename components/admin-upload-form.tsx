"use client";

import { useActionState } from "react";

import {
  adminUploadArticleAction,
  type AdminUploadFormState,
} from "@/app/admin-archive-portal/actions";
import type { ContentDirectoryOption } from "@/lib/content";

const initialState: AdminUploadFormState = {};

type AdminUploadFormProps = {
  directoryOptions: ContentDirectoryOption[];
};

export function AdminUploadForm({ directoryOptions }: AdminUploadFormProps) {
  const [state, action, pending] = useActionState(
    adminUploadArticleAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="target-directory" className="text-sm text-stone-600">
          目标目录
        </label>
        <select
          id="target-directory"
          name="targetDirectory"
          className="w-full rounded-2xl border border-stone-300 bg-white/90 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-900"
          defaultValue={directoryOptions[0]?.value}
        >
          {directoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
          上传的图片会自动写入目标目录下的 `resource/` 文件夹。
        </p>
      </div>

      {state.message ? (
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
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-stone-900 px-4 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-500"
      >
        {pending ? "上传中..." : "上传文章与资源"}
      </button>
    </form>
  );
}
