"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { acceptPrivacyPolicy } from "@/app/actions/privacy";
import { PRIVACY_POLICY_POINTS } from "@/lib/privacy";

export function PrivacyPolicyDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  function accept() {
    setFailed(false);
    startTransition(async () => {
      try {
        await acceptPrivacyPolicy();
        ref.current?.close();
      } catch {
        setFailed(true);
      }
    });
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="privacy-title"
      // Accepting is required, so Escape must not dismiss it.
      onCancel={(e) => e.preventDefault()}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl border border-white/10 bg-stone-950/85 p-6 text-stone-100 sm:p-8 shadow-2xl shadow-black/70 backdrop-blur-md backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <p className="font-mono text-xs tracking-widest text-amber-200/70 uppercase">
        Case file · Notice
      </p>
      <h2 id="privacy-title" className="mt-1 text-2xl font-semibold text-amber-100">
        Privacy policy
      </h2>

      <ul className="mt-6 flex flex-col gap-4">
        {PRIVACY_POLICY_POINTS.map((point) => (
          <li key={point.title} className="border-l-2 border-amber-200/40 pl-4">
            <p className="text-sm font-medium text-stone-100">{point.title}</p>
            <p className="mt-1 text-sm text-stone-400">{point.body}</p>
          </li>
        ))}
      </ul>

      {failed && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          Could not save your answer. Please try again.
        </p>
      )}

      <button
        type="button"
        onClick={accept}
        disabled={pending}
        autoFocus
        className="mt-8 w-full rounded-md bg-amber-200 px-4 py-2 text-sm font-medium text-stone-950 transition hover:bg-amber-100 disabled:opacity-60"
      >
        {pending ? "Saving…" : "OK, I understand"}
      </button>
    </dialog>
  );
}
