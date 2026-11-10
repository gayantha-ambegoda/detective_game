import "server-only";
import { redirect } from "next/navigation";
import { PRIVACY_POLICY_VERSION } from "@/lib/privacy";
import { getSession } from "@/lib/session";
import { findUserById, type UserRole } from "@/lib/users";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  acceptedPrivacyPolicy: boolean;
};

// Reads the session cookie, so callers must render inside a <Suspense> boundary.
export async function getCurrentUser(): Promise<CurrentUser> {
  "use cache: private";

  const session = await getSession();
  if (!session?.userId) {
    redirect("/signin");
  }

  const user = await findUserById(session.userId);
  if (!user) {
    // Valid cookie for a deleted account: clear it, or the proxy keeps sending it to /dashboard.
    redirect("/api/session/clear");
  }

  return {
    id: user._id.toHexString(),
    name: user.name,
    email: user.email,
    role: user.role ?? "user",
    acceptedPrivacyPolicy:
      user.privacyConsents?.some((c) => c.version === PRIVACY_POLICY_VERSION) ?? false,
  };
}

// For admin-only pages: sends anyone else back to the regular dashboard.
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    redirect("/dashboard");
  }
  return user;
}

// For route handlers and actions, which answer with a status instead of redirecting a page.
export async function getAdminId(): Promise<string | null> {
  const session = await getSession();
  if (!session?.userId) return null;
  const user = await findUserById(session.userId);
  return user?.role === "admin" ? user._id.toHexString() : null;
}
