"use client";

import { useActionState, useState } from "react";

import {
  adminUpdateProfileAction,
  adminUpdateSecurityAction,
  type AdminSettingsFormState,
} from "@/app/admin-archive-portal/actions";
import { AvatarCropper } from "@/components/avatar-cropper";
import type { AdminAccountSnapshot } from "@/lib/admin-profile";

type AdminSettingsTabsProps = {
  account: AdminAccountSnapshot;
};

const initialState: AdminSettingsFormState = {
  message: "",
  success: false,
};

const tabs = [
  {
    key: "security",
    label: "安全",
    description: "登录账号与密码",
  },
  {
    key: "profile",
    label: "资料",
    description: "前台展示身份信息",
  },
] as const;

function Feedback({ state }: { state: AdminSettingsFormState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      role={state.success ? "status" : "alert"}
      className={`rounded-2xl border px-4 py-3 text-sm ${
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
      <span className="text-sm font-semibold text-stone-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-2xl border border-stone-300/80 bg-[#fffcf6] px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:ring-2 focus:ring-stone-900/10";

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
    <section className="grid gap-5 rounded-[30px] border border-stone-300/70 bg-[linear-gradient(180deg,rgba(255,252,246,0.94),rgba(244,237,226,0.9))] p-4 shadow-[0_24px_70px_rgba(44,36,24,0.08)] md:p-5 lg:grid-cols-[210px_minmax(0,1fr)]">
      <aside className="rounded-[24px] border border-stone-300/70 bg-[#ece3d6] p-3">
        <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-stone-500">
          Settings
        </p>
        <div className="space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              aria-label={tab.label}
              onClick={() => setActiveTab(tab.key)}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                activeTab === tab.key
                  ? "border-stone-950 bg-stone-950 text-white shadow-[0_16px_40px_rgba(28,23,17,0.18)]"
                  : "border-transparent bg-white/55 text-stone-700 hover:border-stone-300 hover:bg-white"
              }`}
            >
              <span className="block text-sm font-semibold">{tab.label}</span>
              <span
                className={`mt-1 block text-xs ${
                  activeTab === tab.key ? "text-stone-300" : "text-stone-500"
                }`}
              >
                {tab.description}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <div className="min-w-0 rounded-[24px] border border-stone-300/70 bg-white/75 p-5 md:p-6">
        {activeTab === "security" ? (
          <form action={securityAction} className="grid gap-5 md:grid-cols-2">
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
                className="rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_35px_rgba(28,23,17,0.16)] transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-500"
              >
                {securityPending ? "保存中..." : "保存安全设置"}
              </button>
            </div>
          </form>
        ) : (
          <form action={profileAction} className="grid gap-5 md:grid-cols-2">
            <Field id="profile-display-name" label="账号名称">
              <input
                id="profile-display-name"
                name="displayName"
                defaultValue={account.profile.displayName}
                className={inputClass}
              />
            </Field>

            <input type="hidden" name="avatarUrl" value={account.profile.avatarUrl} />

            <div className="md:col-span-2">
              <Field id="profile-avatar-file" label="头像上传与裁剪">
                <AvatarCropper currentAvatarPath={account.profile.avatarUrl} />
              </Field>
            </div>

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
                className="rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_35px_rgba(28,23,17,0.16)] transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-500"
              >
                {profilePending ? "保存中..." : "保存资料信息"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
