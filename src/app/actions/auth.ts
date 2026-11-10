"use server";

import bcrypt from "bcryptjs";
import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import {
  validateSignin,
  validateSignup,
  type FormState,
} from "@/lib/definitions";
import { createSession, deleteSession } from "@/lib/session";
import {
  createUser,
  EmailTakenError,
  findUserByEmail,
  hasAnyUser,
  type UserRole,
} from "@/lib/users";

const DB_ERROR = "Could not reach the database. Check MONGODB_URI and try again.";
const DUMMY_HASH = bcrypt.hashSync("timing-safe-placeholder", 10);

// Hash both sides so timingSafeEqual gets equal-length buffers and the compare leaks nothing.
function matchesEnvironmentKey(input: string) {
  const expected = process.env.ENVIRONMENT_KEY;
  if (!expected) return false;
  const digest = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(digest(input), digest(expected));
}

export async function signup(_state: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const environmentKey = String(formData.get("environmentKey") ?? "");
  const values = { name, email };

  const errors = validateSignup({ name, email, password });
  if (errors) return { errors, values };

  let userId: string;
  try {
    // The very first account is the admin, and only someone holding ENVIRONMENT_KEY may create it.
    let role: UserRole = "user";
    if (!(await hasAnyUser())) {
      if (!process.env.ENVIRONMENT_KEY) {
        console.error("signup failed: missing ENVIRONMENT_KEY environment variable");
        return { message: "Registration is not configured yet. Contact the site owner.", values };
      }
      if (!matchesEnvironmentKey(environmentKey)) {
        return {
          errors: { environmentKey: ["The environment key is incorrect."] },
          values,
          needsEnvironmentKey: true,
        };
      }
      role = "admin";
    }

    const passwordHash = await bcrypt.hash(password, 10);
    userId = await createUser({ name, email, passwordHash, role });
  } catch (error) {
    if (error instanceof EmailTakenError) {
      return { errors: { email: ["An account with this email already exists."] }, values };
    }
    console.error("signup failed", error);
    return { message: DB_ERROR, values };
  }

  await createSession(userId);
  redirect("/dashboard");
}

export async function signin(_state: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const values = { email };

  const errors = validateSignin({ email, password });
  if (errors) return { errors, values };

  let userId: string;
  try {
    const user = await findUserByEmail(email);
    // Compare even when the user is missing so response time doesn't reveal which emails exist.
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) {
      return { message: "Invalid email or password.", values };
    }
    userId = user._id.toHexString();
  } catch (error) {
    console.error("signin failed", error);
    return { message: DB_ERROR, values };
  }

  await createSession(userId);
  redirect("/dashboard");
}

export async function signout() {
  await deleteSession();
  redirect("/signin");
}
