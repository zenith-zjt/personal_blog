import { getKnowledgeBaseTree } from "@/lib/content";
import { decodeRouteSegment } from "@/lib/content-paths";
import { type NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/content/[library]/tree">,
) {
  const { library } = await context.params;
  const decodedLibrary = decodeRouteSegment(library);
  const includeResourceFolders =
    request.nextUrl.searchParams.get("includeResourceFolders") === "true";
  const tree = await getKnowledgeBaseTree(decodedLibrary, { includeResourceFolders });

  return Response.json({
    library: decodedLibrary,
    includeResourceFolders,
    tree,
  });
}
