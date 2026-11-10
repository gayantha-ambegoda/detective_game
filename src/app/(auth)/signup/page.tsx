import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthForm } from "@/app/ui/auth-form";
import { hasAnyUser } from "@/lib/users";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <Suspense fallback={<AuthForm mode="signup" />}>
      <SignupForm />
    </Suspense>
  );
}

// Whether an account exists must be read per request, not baked in at build time.
async function SignupForm() {
  await connection();
  let needsEnvironmentKey = false;
  try {
    needsEnvironmentKey = !(await hasAnyUser());
  } catch (error) {
    // The action re-checks on submit and reports the database error there.
    console.error("signup page: could not check for existing users", error);
  }
  return <AuthForm mode="signup" needsEnvironmentKey={needsEnvironmentKey} />;
}
