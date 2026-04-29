"use client";

import { useActionState, useState } from "react";

import {
  adminUpdateProfileAction,
  adminUpdateSecurityAction,
  type AdminSettingsFormState,
} from "@/app/admin-archive-portal/actions";
import type { AdminAccountSnapshot } from "@/lib/admin-profile";

type AdminSettingsTabsProps = {
  account: AdminAccountSnapshot;
};

const initialState: AdminSettingsFormState = {
  message: "",
  success: false,
};

function Feedback({ state }: { state: AdminSettingsFormState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      role={state.success ? "status" : "alert"}
      className={`rounded-lg border px-4 py-3 text-sm ${
        state.success
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {state.message}
    </p>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="block space-y-2">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10";

export function AdminSettingsTabs({ account }: AdminSettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<"security" | "profile">("security");
  const [securityState, securityAction, securityPending] = useActionState(
    adminUpdateSecurityAction,
    initialState,
  );
  const [profileState, profileAction, profilePending] = useActionState(
    adminUpdateProfileAction,
    initialState,
  );

  return (
    <section className="rounded-lg border border-stone-300/70 bg-white/90 p-5 shadow-[0_18px_60px_rgba(44,36,24,0.08)] md:p-8">
      <div className="flex w-full flex-wrap gap-2 border-b border-stone-200 pb-4">
        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "security"
              ? "bg-stone-900 text-white"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          安全
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "profile"
              ? "bg-stone-900 text-white"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          资料
        </button>
      </div>

      {activeTab === "security" ? (
        <form action={securityAction} className="mt-6 grid gap-5 md:grid-cols-2">
          <Field id="settings-username" label="后台登录用户名">
            <input
              id="settings-username"
              name="username"
              defaultValue={account.username}
              className={inputClass}
              autoComplete="username"
            />
          </Field>

          <Field id="settings-current-password" label="当前密码">
            <input
              id="settings-current-password"
              name="currentPassword"
              type="password"
              className={inputClass}
              autoComplete="current-password"
            />
          </Field>

          <Field id="settings-next-password" label="新密码">
            <input
              id="settings-next-password"
              name="nextPassword"
              type="password"
              className={inputClass}
              autoComplete="new-password"
              placeholder="留空则只修改用户名"
            />
          </Field>

          <Field id="settings-confirm-password" label="确认新密码">
            <input
              id="settings-confirm-password"
              name="confirmPassword"
              type="password"
              className={inputClass}
              autoComplete="new-password"
            />
          </Field>

          <div className="md:col-span-2">
            <Feedback state={securityState} />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={securityPending}
              className="rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-500"
            >
              {securityPending ? "保存中..." : "保存安全设置"}
            </button>
          </div>
        </form>
      ) : (
        <form action={profileAction} className="mt-6 grid gap-5 md:grid-cols-2">
          <Field id="profile-display-name" label="账号名称">
            <input
              id="profile-display-name"
              name="displayName"
              defaultValue={account.profile.displayName}
              className={inputClass}
            />
          </Field>

          <input type="hidden" name="avatarUrl" value={account.profile.avatarUrl} />

          <Field id="profile-avatar-file" label="头像上传">
            <input
              id="profile-avatar-file"
              name="avatarFile"
              type="file"
              accept=".png,.jpg,.jpeg,.gif,.webp,.svg,image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
              className={inputClass}
            />
            <span className="block text-xs text-stone-500">
              当前头像路径：{account.profile.avatarUrl || "未设置"}
            </span>
          </Field>

          <Field id="profile-role-label" label="身份属性">
            <input
              id="profile-role-label"
              name="roleLabel"
              defaultValue={account.profile.roleLabel}
              className={inputClass}
            />
          </Field>

          <Field id="profile-profession" label="身份 / 职业">
            <input
              id="profile-profession"
              name="profession"
              defaultValue={account.profile.profession}
              className={inputClass}
            />
          </Field>

          <Field id="profile-location" label="所在地">
            <input
              id="profile-location"
              name="location"
              defaultValue={account.profile.location}
              className={inputClass}
            />
          </Field>

          <Field id="profile-github-url" label="GitHub 地址">
            <input
              id="profile-github-url"
              name="githubUrl"
              defaultValue={account.profile.githubUrl}
              className={inputClass}
              placeholder="https://github.com/..."
            />
          </Field>

          <div className="md:col-span-2">
            <Field id="profile-signature" label="个性签名">
              <input
                id="profile-signature"
                name="signature"
                defaultValue={account.profile.signature}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field id="profile-tech-stack" label="技术栈">
              <input
                id="profile-tech-stack"
                name="techStack"
                defaultValue={account.profile.techStack.join(", ")}
                className={inputClass}
                placeholder="Next.js, React, Java"
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field id="profile-bio" label="个人简介">
              <textarea
                id="profile-bio"
                name="bio"
                defaultValue={account.profile.bio}
                className={`${inputClass} min-h-36 resize-y leading-7`}
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Feedback state={profileState} />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={profilePending}
              className="rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-500"
            >
              {profilePending ? "保存中..." : "保存资料信息"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
