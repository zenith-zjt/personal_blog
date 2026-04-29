import { requireAdminSession } from "@/lib/admin-auth";
import { createSystemBackupZip } from "@/lib/archive";

export async function GET() {
  await requireAdminSession();

  const zipBuffer = await createSystemBackupZip();

  return new Response(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="system-backup.zip"',
      "Cache-Control": "no-store",
    },
  });
}
