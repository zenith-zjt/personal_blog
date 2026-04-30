import { NextResponse, type NextRequest } from "next/server";

import {
  getAdminBasePath,
  INTERNAL_ADMIN_BASE_PATH,
  isCustomAdminPathEnabled,
} from "@/lib/admin-paths";

function startsWithPath(pathname: string, basePath: string) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function notFound() {
  return new NextResponse("Not found", {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

function getInternalRewriteToken() {
  return process.env.ADMIN_SESSION_SECRET?.trim() || "development-admin-rewrite";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isInternalAdminRewrite =
    request.headers.get("x-personal-blog-admin-rewrite") ===
    getInternalRewriteToken();

  if (startsWithPath(pathname, "/data") || startsWithPath(pathname, "/content")) {
    return notFound();
  }

  if (!isCustomAdminPathEnabled()) {
    return NextResponse.next();
  }

  const adminBasePath = getAdminBasePath();

  if (startsWithPath(pathname, INTERNAL_ADMIN_BASE_PATH)) {
    if (isInternalAdminRewrite) {
      return NextResponse.next();
    }

    return notFound();
  }

  if (startsWithPath(pathname, adminBasePath)) {
    const url = request.nextUrl.clone();
    const suffix = pathname.slice(adminBasePath.length);
    url.pathname = `${INTERNAL_ADMIN_BASE_PATH}${suffix || ""}`;
    const headers = new Headers(request.headers);
    headers.set("x-personal-blog-admin-rewrite", getInternalRewriteToken());
    return NextResponse.rewrite(url, {
      request: {
        headers,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
