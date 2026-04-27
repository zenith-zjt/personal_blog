import { getDefaultArticleSlug, readArticle } from "@/lib/content";
import { decodeRouteSegment, decodeRouteSegments } from "@/lib/content-paths";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/content/[library]/article/[[...slug]]">,
) {
  const { library, slug } = await context.params;
  const decodedLibrary = decodeRouteSegment(library);
  const decodedSlug = slug ? decodeRouteSegments(slug) : undefined;
  const slugParts = decodedSlug ?? (await getDefaultArticleSlug(decodedLibrary));

  if (!slugParts) {
    return Response.json(
      {
        error: "No article found for the requested knowledge base.",
      },
      { status: 404 },
    );
  }

  const article = await readArticle(decodedLibrary, slugParts);
  return Response.json({
    library: decodedLibrary,
    article,
  });
}
