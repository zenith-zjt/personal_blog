import { getStageOneSnapshot } from "@/lib/content";

export async function GET() {
  const snapshot = await getStageOneSnapshot();
  return Response.json(snapshot);
}
