import { getKnowledgeBaseTree } from "@/lib/content";
import { type NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/content/[library]/tree">,
) {
  const { library } = await context.params;
  const includeResourceFolders =
    request.nextUrl.searchParams.get("includeResourceFolders") === "true";
  const tree = await getKnowledgeBaseTree(library, { includeResourceFolders });

  return Response.json({
    library,
    includeResourceFolders,
    tree,
  });
}
