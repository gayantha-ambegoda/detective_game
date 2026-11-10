import type { Metadata } from "next";
import { AuthForm } from "@/app/ui/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SigninPage() {
  return <AuthForm mode="signin" />;
}
