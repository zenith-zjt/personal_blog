import { readProfileAsset } from "@/lib/archive";

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params;
    const relativePath = path.join("/");
    const asset = await readProfileAsset(relativePath);

    return new Response(asset.data, {
      headers: {
        "Content-Type": asset.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
