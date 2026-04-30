export const INTERNAL_ADMIN_BASE_PATH = "/admin-archive-portal";

function normalizeBasePath(value: string | undefined) {
  const raw = value?.trim() || INTERNAL_ADMIN_BASE_PATH;
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  const normalized = withLeadingSlash.replace(/\/+$/g, "");

  if (!/^\/[a-zA-Z0-9/_-]{6,80}$/.test(normalized)) {
    return INTERNAL_ADMIN_BASE_PATH;
  }

  if (
    normalized.startsWith("/api") ||
    normalized.startsWith("/_next") ||
    normalized.startsWith("/kb") ||
    normalized.startsWith("/search")
  ) {
    return INTERNAL_ADMIN_BASE_PATH;
  }

  return normalized;
}

export function getAdminBasePath() {
  return normalizeBasePath(process.env.ADMIN_ROUTE_BASE);
}

export function getInternalAdminPath(suffix = "") {
  if (!suffix) return INTERNAL_ADMIN_BASE_PATH;
  return `${INTERNAL_ADMIN_BASE_PATH}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}

export function getAdminPath(suffix = "") {
  if (!suffix) return getAdminBasePath();
  return `${getAdminBasePath()}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}

export function isCustomAdminPathEnabled() {
  return getAdminBasePath() !== INTERNAL_ADMIN_BASE_PATH;
}
