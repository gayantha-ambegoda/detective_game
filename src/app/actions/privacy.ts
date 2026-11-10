"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacy";
import { getSession } from "@/lib/session";
import { recordPrivacyConsent } from "@/lib/users";

export async function acceptPrivacyPolicy() {
  // Re-read the session here rather than trusting anything from the client.
  const session = await getSession();
  if (!session?.userId) redirect("/signin");

  await recordPrivacyConsent(session.userId, PRIVACY_POLICY_VERSION);
  refresh();
}
