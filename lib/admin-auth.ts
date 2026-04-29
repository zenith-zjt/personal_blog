import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  getAdminCredentialHints as readAdminCredentialHints,
  verifyAdminCredentials as verifyStoredAdminCredentials,
} from "@/lib/admin-profile";

const SESSION_COOKIE_NAME = "personal_blog_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;

type AdminSessionPayload = {
  username: string;
  expiresAt: number;
};

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? "personal-blog-admin-session-secret";
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
  const payload: AdminSessionPayload = {
    username,
    expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000,
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

export async function createAdminSession(username: string) {
  const cookieStore = await cookies();
  const token = createSessionToken(username);

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  return parseSessionToken(token);
}

export async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin-archive-portal/login");
  }

  return session;
}

export async function redirectIfAdminSessionExists() {
  const session = await getAdminSession();

  if (session) {
    redirect("/admin-archive-portal");
  }
}

export async function getAdminCredentialHints() {
  return readAdminCredentialHints();
}
