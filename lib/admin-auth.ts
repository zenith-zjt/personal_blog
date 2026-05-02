import { createHmac, timingSafeEqual } from "node:crypto";

import { headers } from "next/headers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAdminPath } from "@/lib/admin-paths";
import {
  getAdminCredentialHints as readAdminCredentialHints,
  verifyAdminCredentials as verifyStoredAdminCredentials,
} from "@/lib/admin-profile";

const SESSION_COOKIE_NAME = "personal_blog_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPT_LOCK_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPT_LIMIT = 5;

type LoginAttemptRecord = {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
};

type AdminSessionPayload = {
  username: string;
  issuedAt: number;
  expiresAt: number;
};

const loginAttempts = new Map<string, LoginAttemptRecord>();

function parseBooleanEnvFlag(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return null;
}

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("生产环境必须配置 ADMIN_SESSION_SECRET。");
  }

  return "personal-blog-admin-session-secret";
}

function encodePayload(payload: AdminSessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(encodedPayload: string) {
  const decoded = Buffer.from(encodedPayload, "base64url").toString("utf8");
  return JSON.parse(decoded) as AdminSessionPayload;
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function createSessionToken(username: string) {
  const now = Date.now();
  const payload: AdminSessionPayload = {
    username,
    issuedAt: now,
    expiresAt: now + SESSION_DURATION_SECONDS * 1000,
  };
  const encodedPayload = encodePayload(payload);
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function parseSessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [encodedPayload, providedSignature] = token.split(".");

  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);

  if (!constantTimeEqual(providedSignature, expectedSignature)) {
    return null;
  }

  try {
    const payload = decodePayload(encodedPayload);

    if (payload.expiresAt <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function verifyAdminCredentials(username: string, password: string) {
  return verifyStoredAdminCredentials(username, password);
}

async function getLoginAttemptKey(username: string) {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headerStore.get("x-real-ip")?.trim();
  const userAgent = headerStore.get("user-agent")?.slice(0, 120) ?? "unknown";
  const ip = forwardedFor || realIp || "local";

  return `${ip}:${username.toLowerCase()}:${userAgent}`;
}

function pruneLoginAttempt(record: LoginAttemptRecord, now: number) {
  if (record.lockedUntil && record.lockedUntil > now) {
    return record;
  }

  if (now - record.firstAttemptAt > LOGIN_ATTEMPT_WINDOW_MS) {
    return null;
  }

  return {
    count: record.count,
    firstAttemptAt: record.firstAttemptAt,
  } satisfies LoginAttemptRecord;
}

export async function getAdminLoginRateLimit(username: string) {
  const key = await getLoginAttemptKey(username);
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record) {
    return { allowed: true, key } as const;
  }

  const normalized = pruneLoginAttempt(record, now);

  if (!normalized) {
    loginAttempts.delete(key);
    return { allowed: true, key } as const;
  }

  loginAttempts.set(key, normalized);

  if (normalized.lockedUntil && normalized.lockedUntil > now) {
    return {
      allowed: false,
      key,
      retryAfterSeconds: Math.ceil((normalized.lockedUntil - now) / 1000),
    } as const;
  }

  return { allowed: true, key } as const;
}

export function recordAdminLoginFailure(key: string) {
  const now = Date.now();
  const current = loginAttempts.get(key);
  const normalized = current ? pruneLoginAttempt(current, now) : null;
  const nextRecord: LoginAttemptRecord = normalized ?? {
    count: 0,
    firstAttemptAt: now,
  };

  nextRecord.count += 1;

  if (nextRecord.count >= LOGIN_ATTEMPT_LIMIT) {
    nextRecord.lockedUntil = now + LOGIN_ATTEMPT_LOCK_MS;
  }

  loginAttempts.set(key, nextRecord);
}

export function clearAdminLoginFailures(key: string) {
  loginAttempts.delete(key);
}

async function shouldUseSecureSessionCookie() {
  const explicit = parseBooleanEnvFlag(process.env.ADMIN_SESSION_SECURE);

  if (explicit !== null) {
    return explicit;
  }

  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const headerStore = await headers();
  const forwardedProto = headerStore
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  if (forwardedProto) {
    return forwardedProto === "https";
  }

  const forwarded = headerStore.get("forwarded");
  if (forwarded) {
    const match = forwarded.match(/proto=(https?)/i);
    if (match) {
      return match[1].toLowerCase() === "https";
    }
  }

  const origin = headerStore.get("origin");
  if (origin) {
    return origin.startsWith("https://");
  }

  const referer = headerStore.get("referer");
  if (referer) {
    return referer.startsWith("https://");
  }

  return false;
}

export async function createAdminSession(username: string) {
  const cookieStore = await cookies();
  const token = createSessionToken(username);
  const secure = await shouldUseSecureSessionCookie();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
    priority: "high",
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const secure = await shouldUseSecureSessionCookie();

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: "/",
    maxAge: 0,
    priority: "high",
  });
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  return parseSessionToken(token);
}

export async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session) {
    redirect(getAdminPath("/login"));
  }

  return session;
}

export async function redirectIfAdminSessionExists() {
  const session = await getAdminSession();

  if (session) {
    redirect(getAdminPath());
  }
}

export async function getAdminCredentialHints() {
  return readAdminCredentialHints();
}
