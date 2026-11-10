import { redirect } from "next/navigation";
import { deleteSession } from "@/lib/session";

// Pages can't change cookies while rendering, so the DAL sends a session whose user no longer
// exists here. Without this, the proxy and dashboard would bounce it between /signin and /dashboard.
export async function GET() {
  await deleteSession();
  redirect("/signin");
}
