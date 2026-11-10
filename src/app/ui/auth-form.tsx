"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signin, signup } from "@/app/actions/auth";

type Mode = "signin" | "signup";

const copy = {
  signin: {
    title: "Sign in",
    submit: "Sign in",
    pending: "Signing in…",
    alt: "Don't have an account?",
    altLink: "Sign up",
    altHref: "/signup",
  },
  signup: {
    title: "Create an account",
    submit: "Sign up",
    pending: "Creating account…",
    alt: "Already have an account?",
    altLink: "Sign in",
    altHref: "/signin",
  },
} as const;

const inputClass =
  "w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-base text-stone-100 placeholder:text-stone-500 outline-none transition focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/20";

const labelClass = "text-sm font-medium text-stone-300";

export function AuthForm({
  mode,
  needsEnvironmentKey = false,
}: {
  mode: Mode;
  // Only the first signup asks for it; that account becomes the admin.
  needsEnvironmentKey?: boolean;
}) {
  const [state, action, pending] = useActionState(
    mode === "signup" ? signup : signin,
    undefined,
  );
  const t = copy[mode];

  return (
    <form
      action={action}
      className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-white/10 bg-stone-950/60 p-6 shadow-2xl sm:p-8 shadow-black/60 backdrop-blur-md"
    >
      <h1 className="text-2xl font-semibold text-amber-100">{t.title}</h1>

      {mode === "signup" && (
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className={labelClass}>Name</label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            defaultValue={state?.values?.name}
            className={inputClass}
            required
          />
          <FieldErrors errors={state?.errors?.name} />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className={labelClass}>Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state?.values?.email}
          className={inputClass}
          required
        />
        <FieldErrors errors={state?.errors?.email} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className={labelClass}>Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className={inputClass}
          required
        />
        <FieldErrors errors={state?.errors?.password} />
      </div>

      {mode === "signup" && (needsEnvironmentKey || state?.needsEnvironmentKey) && (
        <div className="flex flex-col gap-1">
          <label htmlFor="environmentKey" className={labelClass}>Environment key</label>
          <input
            id="environmentKey"
            name="environmentKey"
            type="password"
            autoComplete="off"
            aria-describedby="environmentKey-hint"
            className={inputClass}
            required
          />
          <p id="environmentKey-hint" className="text-xs text-stone-400">
            You&apos;re creating the first account. Enter the environment key to register as admin.
          </p>
          <FieldErrors errors={state?.errors?.environmentKey} />
        </div>
      )}

      {state?.message && (
        <p role="alert" className="text-sm text-red-400">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-amber-200 px-4 py-2 text-sm font-medium text-stone-950 transition hover:bg-amber-100 disabled:opacity-60"
      >
        {pending ? t.pending : t.submit}
      </button>

      <p className="text-sm text-stone-400">
        {t.alt}{" "}
        <Link href={t.altHref} className="text-amber-200 underline hover:text-amber-100">
          {t.altLink}
        </Link>
      </p>
    </form>
  );
}

function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <ul className="text-sm text-red-400">
      {errors.map((error) => (
        <li key={error}>{error}</li>
      ))}
    </ul>
  );
}
