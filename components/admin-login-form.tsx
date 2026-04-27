"use client";

import { useActionState } from "react";

import {
  adminLoginAction,
  type AdminLoginFormState,
} from "@/app/admin-archive-portal/actions";

const initialState: AdminLoginFormState = {};

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLoginAction, initialState);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="admin-username" className="text-sm text-stone-600">
          用户名
        </label>
        <input
          id="admin-username"
          name="username"
          type="text"
          autoComplete="username"
          defaultValue="admin"
          className="w-full rounded-2xl border border-stone-300 bg-white/90 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-900"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="admin-password" className="text-sm text-stone-600">
          密码
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          defaultValue="admin"
          className="w-full rounded-2xl border border-stone-300 bg-white/90 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-900"
        />
      </div>

      {state.message ? (
        <p
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-stone-900 px-4 py-3 text-sm font-medium text-stone-50 transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-500"
      >
        {pending ? "登录中..." : "进入后台"}
      </button>
    </form>
  );
}
