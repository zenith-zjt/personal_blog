"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  adminCreateDirectoryAction,
  adminCreateKnowledgeBaseAction,
  type AdminUploadFormState,
} from "@/app/admin-archive-portal/actions";

const initialState: AdminUploadFormState = {
  message: "",
  success: false,
};

function Feedback({ state }: { state: AdminUploadFormState }) {
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

export function AdminCreateKnowledgeBaseForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    adminCreateKnowledgeBaseAction as (
      state: AdminUploadFormState,
      payload: FormData,
    ) => Promise<AdminUploadFormState>,
    initialState,
  );

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
    }
  }, [router, state.redirectTo]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="library-name" className="text-sm text-stone-600">
          新知识库名称
        </label>
        <input
          id="library-name"
          name="libraryName"
          type="text"
          placeholder="例如：product-notes"
          className="w-full rounded-2xl border border-stone-300 bg-white/90 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-900"
        />
      </div>

      <Feedback state={state} />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-stone-900 px-4 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-500"
      >
        {pending ? "创建中..." : "新增知识库"}
      </button>
    </form>
  );
}

export function AdminCreateDirectoryForm({
  targetDirectory,
}: {
  targetDirectory: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    adminCreateDirectoryAction as (
      state: AdminUploadFormState,
      payload: FormData,
    ) => Promise<AdminUploadFormState>,
    initialState,
  );

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo, { scroll: false });
    }
  }, [router, state.redirectTo]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="targetDirectory" value={targetDirectory} />

      <div className="space-y-2">
        <label htmlFor="directory-name" className="text-sm text-stone-600">
          在当前目录下新建文件夹
        </label>
        <input
          id="directory-name"
          name="directoryName"
          type="text"
          placeholder="例如：drafts"
          className="w-full rounded-2xl border border-stone-300 bg-white/90 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-900"
        />
      </div>

      <p className="text-xs leading-6 text-stone-500">
        新建文章时会自动生成同级 `文章名.assets` 资源目录。
      </p>

      <Feedback state={state} />

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-900 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-400"
      >
        {pending ? "创建中..." : "新建文件夹"}
      </button>
    </form>
  );
}
