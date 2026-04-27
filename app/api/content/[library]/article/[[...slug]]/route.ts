import { getDefaultArticleSlug, readArticle } from "@/lib/content";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/content/[library]/article/[[...slug]]">,
) {
  const { library, slug } = await context.params;
  const slugParts = slug ?? (await getDefaultArticleSlug(library));

  if (!slugParts) {
    return Response.json(
      {
        error: "No article found for the requested knowledge base.",
      },
      { status: 404 },
    );
  }

  const article = await readArticle(library, slugParts);
  return Response.json({
    library,
    article,
  });
}
