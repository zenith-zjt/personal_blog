import { requireAdminSession } from "@/lib/admin-auth";
import { createBlogMigrationZip } from "@/lib/archive";

export async function GET() {
  await requireAdminSession();

  const zipBuffer = await createBlogMigrationZip();

  return new Response(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="blog-migration.zip"',
      "Cache-Control": "no-store",
    },
  });
}
