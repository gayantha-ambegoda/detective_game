"use server";

import { redirect } from "next/navigation";
import { validateReport, type ReportFormState } from "@/lib/definitions";
import { createReport } from "@/lib/reports";
import { getSession } from "@/lib/session";

export async function submitReport(
  _state: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  // Re-read the session here rather than trusting anything from the client.
  const session = await getSession();
  if (!session?.userId) redirect("/signin");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const values = { title, description };

  const errors = validateReport(values);
  if (errors) return { errors, values };

  try {
    await createReport({ userId: session.userId, ...values });
  } catch (error) {
    console.error("report failed", error);
    return { message: "Could not file your report. Please try again.", values };
  }
  return { ok: true };
}
