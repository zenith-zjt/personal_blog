import { readAssetFile } from "@/lib/content";

const MIME_TYPES: Record<string, string> = {
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  context: RouteContext<"/api/assets/[library]/[[...path]]">,
) {
  const { library, path: assetPath } = await context.params;

  if (!assetPath || assetPath.length === 0) {
    return new Response("Missing asset path.", { status: 400 });
  }

  const asset = await readAssetFile(library, assetPath);
  const extension = asset.fileName.slice(asset.fileName.lastIndexOf(".")).toLowerCase();
  const contentType = MIME_TYPES[extension] ?? "application/octet-stream";

  return new Response(asset.fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
