import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const SETTINGS_ROOT = path.join(process.cwd(), "data");
const ACCOUNT_FILE = path.join(SETTINGS_ROOT, "admin-account.json");
const RESOURCE_DIR_NAME = "resource";
const DATA_RESOURCE_ROOT = path.join(SETTINGS_ROOT, RESOURCE_DIR_NAME);
const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "admin";
const ALLOWED_AVATAR_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
]);

export type AdminPublicProfile = {
  displayName: string;
  avatarUrl: string;
  roleLabel: string;
  signature: string;
  profession: string;
  bio: string;
  techStack: string[];
  githubUrl: string;
  location: string;
};

type AdminAccountConfig = {
  username: string;
  passwordSalt: string;
  passwordHash: string;
  profile: AdminPublicProfile;
};

export type AdminAccountSnapshot = {
  username: string;
  profile: AdminPublicProfile;
};

export type UploadedProfileFile = {
  name: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export type VerifyCredentialResult =
  | { ok: true; username: string }
  | { ok: false; message: string };

const defaultProfile: AdminPublicProfile = {
  displayName: "Alex Chen",
  avatarUrl: "",
  roleLabel: "知识库维护者",
  signature: "把工程经验整理成可以复用的知识路径。",
  profession: "Full-stack Developer / Technical Writer",
  bio: "长期关注前端工程化、Java 服务端、AI 工具链和个人知识管理。这个博客用 Markdown 和目录树组织文章，目标是让每篇笔记都能快速被找到、被复用。",
  techStack: ["Next.js", "React", "TypeScript", "Java", "Spring", "AI Tools"],
  githubUrl: "https://github.com/example",
  location: "Hong Kong / Remote",
};

function createPasswordHash(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return {
    salt,
    hash,
  };
}

function defaultAccount(): AdminAccountConfig {
  const password = createPasswordHash(DEFAULT_PASSWORD, "default-admin-salt");

  return {
    username: DEFAULT_USERNAME,
    passwordSalt: password.salt,
    passwordHash: password.hash,
    profile: defaultProfile,
  };
}

function normalizeProfile(profile: Partial<AdminPublicProfile> = {}) {
  return {
    ...defaultProfile,
    ...profile,
    techStack:
      Array.isArray(profile.techStack) && profile.techStack.length > 0
        ? profile.techStack
        : defaultProfile.techStack,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertString(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== "string") {
    throw new Error(`配置文件字段非法：${fieldName}`);
  }
}

export function validateAdminAccountConfig(value: unknown) {
  if (!isRecord(value)) {
    throw new Error("配置文件格式非法。");
  }

  assertString(value.username, "username");
  assertString(value.passwordSalt, "passwordSalt");
  assertString(value.passwordHash, "passwordHash");

  const username = value.username;

  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) {
    throw new Error("配置文件中的用户名非法。");
  }

  if (!isRecord(value.profile)) {
    throw new Error("配置文件缺少合法 profile。");
  }

  const profile = value.profile;
  [
    "displayName",
    "avatarUrl",
    "roleLabel",
    "signature",
    "profession",
    "bio",
    "githubUrl",
    "location",
  ].forEach((field) => assertString(profile[field], `profile.${field}`));

  if (!Array.isArray(profile.techStack)) {
    throw new Error("配置文件字段非法：profile.techStack");
  }

  for (const item of profile.techStack) {
    assertString(item, "profile.techStack[]");
  }
}

async function readAccountConfig(): Promise<AdminAccountConfig> {
  try {
    const raw = await fs.readFile(ACCOUNT_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<AdminAccountConfig>;

    if (!parsed.username || !parsed.passwordHash || !parsed.passwordSalt) {
      return defaultAccount();
    }

    return {
      username: parsed.username,
      passwordSalt: parsed.passwordSalt,
      passwordHash: parsed.passwordHash,
      profile: normalizeProfile(parsed.profile),
    };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return defaultAccount();
    }

    throw error;
  }
}

async function writeAccountConfig(config: AdminAccountConfig) {
  await fs.mkdir(SETTINGS_ROOT, { recursive: true });
  await fs.writeFile(ACCOUNT_FILE, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function ensureSafeResourceFileName(fileName: string) {
  const baseName = path.basename(fileName).replace(/[^\w.-]+/g, "-");
  const extension = path.extname(baseName).toLowerCase();
  const stem = path.basename(baseName, extension).replace(/^\.+/, "");

  if (!stem || !ALLOWED_AVATAR_EXTENSIONS.has(extension)) {
    throw new Error("头像仅支持 png、jpg、jpeg、gif、webp、svg 格式。");
  }

  return `${Date.now()}-${stem}${extension}`;
}

export function getDataResourceRoot() {
  return DATA_RESOURCE_ROOT;
}

export function resolveProfileAvatarUrl(avatarUrl: string) {
  const cleaned = avatarUrl.trim();

  if (!cleaned) {
    return "";
  }

  if (/^(https?:|data:|\/)/.test(cleaned)) {
    return cleaned;
  }

  return `/api/profile-assets/${cleaned
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

async function saveAvatarFile(file: UploadedProfileFile) {
  const avatarName = ensureSafeResourceFileName(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length === 0) {
    throw new Error("头像文件不能为空。");
  }

  await fs.mkdir(DATA_RESOURCE_ROOT, { recursive: true });
  await fs.writeFile(path.join(DATA_RESOURCE_ROOT, avatarName), buffer);

  return `${RESOURCE_DIR_NAME}/${avatarName}`;
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export async function verifyAdminCredentials(
  username: string,
  password: string,
): Promise<VerifyCredentialResult> {
  if (!username.trim() || !password.trim()) {
    return {
      ok: false,
      message: "请输入用户名和密码。",
    };
  }

  const account = await readAccountConfig();
  const candidate = createPasswordHash(password, account.passwordSalt);

  if (
    username !== account.username ||
    !constantTimeEqual(candidate.hash, account.passwordHash)
  ) {
    return {
      ok: false,
      message: "用户名或密码错误。",
    };
  }

  return {
    ok: true,
    username: account.username,
  };
}

export async function getAdminCredentialHints() {
  const account = await readAccountConfig();

  return {
    defaultUsername: account.username,
    defaultPassword: account.username === DEFAULT_USERNAME ? DEFAULT_PASSWORD : "",
  };
}

export async function getAdminAccountSnapshot(): Promise<AdminAccountSnapshot> {
  const account = await readAccountConfig();
  return {
    username: account.username,
    profile: account.profile,
  };
}

export async function getAdminPublicProfile() {
  const account = await readAccountConfig();
  return account.profile;
}

export async function ensureAdminAccountFile() {
  const account = await readAccountConfig();
  await writeAccountConfig(account);
  return account;
}

export async function updateAdminSecurity(input: {
  username: string;
  currentPassword: string;
  nextPassword: string;
  confirmPassword: string;
}) {
  const account = await readAccountConfig();
  const nextUsername = input.username.trim();

  if (!nextUsername) {
    throw new Error("用户名不能为空。");
  }

  if (!/^[a-zA-Z0-9_-]{3,32}$/.test(nextUsername)) {
    throw new Error("用户名仅支持 3-32 位英文、数字、下划线或短横线。");
  }

  const verification = await verifyAdminCredentials(
    account.username,
    input.currentPassword,
  );

  if (!verification.ok) {
    throw new Error("当前密码不正确。");
  }

  if (input.nextPassword || input.confirmPassword) {
    if (input.nextPassword !== input.confirmPassword) {
      throw new Error("两次输入的新密码不一致。");
    }

    if (input.nextPassword.length < 8) {
      throw new Error("新密码至少需要 8 位。");
    }

    const nextPassword = createPasswordHash(input.nextPassword);
    account.passwordSalt = nextPassword.salt;
    account.passwordHash = nextPassword.hash;
  }

  account.username = nextUsername;
  await writeAccountConfig(account);

  return {
    username: account.username,
  };
}

export async function updateAdminProfile(
  profile: AdminPublicProfile,
  avatarFile?: UploadedProfileFile,
) {
  const account = await readAccountConfig();
  const nextAvatarUrl =
    avatarFile && avatarFile.name
      ? await saveAvatarFile(avatarFile)
      : profile.avatarUrl.trim();
  const cleanedProfile = normalizeProfile({
    displayName: profile.displayName.trim() || defaultProfile.displayName,
    avatarUrl: nextAvatarUrl,
    roleLabel: profile.roleLabel.trim() || defaultProfile.roleLabel,
    signature: profile.signature.trim() || defaultProfile.signature,
    profession: profile.profession.trim() || defaultProfile.profession,
    bio: profile.bio.trim() || defaultProfile.bio,
    githubUrl: profile.githubUrl.trim(),
    location: profile.location.trim(),
    techStack: profile.techStack.map((item) => item.trim()).filter(Boolean),
  });

  account.profile = cleanedProfile;
  await writeAccountConfig(account);

  return account.profile;
}
