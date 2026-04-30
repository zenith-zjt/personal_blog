import { redirect } from "next/navigation";

import { getAdminPath } from "@/lib/admin-paths";

export default function AdminUploadPage() {
  redirect(getAdminPath("/tree"));
}
