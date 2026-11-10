"use client";

import { useActionState, useRef, useState } from "react";
import { submitReport } from "@/app/actions/report";
import { REPORT_DESCRIPTION_MAX, REPORT_TITLE_MAX } from "@/lib/definitions";

const inputClass =
  "w-full rounded-sm border border-red-950 bg-black/60 px-3 py-2 font-mono text-base text-stone-100 placeholder:text-stone-600 outline-none transition focus:border-red-700/80 focus:ring-2 focus:ring-red-800/30";

const labelClass = "font-mono text-xs tracking-widest text-stone-400 uppercase";

export function ReportButton() {
  const ref = useRef<HTMLDialogElement>(null);
  // Remounting the form clears both its fields and the action state after a report is filed.
  const [formKey, setFormKey] = useState(0);

  function close() {
    ref.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-label="Report something"
        title="Report something"
        className="grid size-12 place-items-center rounded-full border border-red-800/60 bg-stone-950/80 text-red-400 shadow-lg shadow-red-950/60 backdrop-blur-sm transition hover:border-red-600 hover:text-red-300 hover:shadow-red-900/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.33 2q2 0 3.87-.82A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.53" />
        </svg>
      </button>

      <dialog
        ref={ref}
        aria-labelledby="report-title"
        onClose={() => setFormKey((k) => k + 1)}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-sm border border-red-900/50 bg-stone-950 bg-[radial-gradient(ellipse_at_top,rgba(127,29,29,0.25)_0%,transparent_60%)] p-6 text-stone-100 shadow-2xl shadow-red-950/50 backdrop:bg-black/80 backdrop:backdrop-blur-sm sm:p-8"
      >
        <ReportForm key={formKey} onClose={close} />
      </dialog>
    </>
  );
}

function ReportForm({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState(submitReport, undefined);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute -top-2 -right-2 grid size-9 place-items-center rounded-full text-stone-500 transition hover:text-red-300 focus-visible:outline-2 focus-visible:outline-red-500 sm:-top-4 sm:-right-4"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className="size-5"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      <p className="pr-8 font-mono text-xs tracking-[0.3em] text-red-500/80 uppercase">
        Case file · Incident report
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 pr-8">
        <h2 id="report-title" className="font-serif text-2xl font-semibold text-stone-100 sm:text-3xl">
          Report what you saw
        </h2>
        <span
          aria-hidden
          className="-rotate-6 rounded-sm border-2 border-red-700/80 px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.25em] text-red-600/90 uppercase"
        >
          Confidential
        </span>
      </div>

      {state?.ok ? (
        <div className="mt-6 border-l-2 border-red-800/70 pl-4" role="status">
          <p className="font-serif text-lg text-stone-100">Your report has been filed.</p>
          <p className="mt-1 text-sm text-stone-400">
            The ink is dry and the envelope is sealed. We&apos;ll look into it — quietly.
          </p>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="mt-6 w-full rounded-sm border border-red-900/60 bg-black/50 px-4 py-2.5 font-mono text-sm font-semibold tracking-widest text-stone-200 uppercase transition hover:border-red-700 hover:text-red-200"
          >
            Close the file
          </button>
        </div>
      ) : (
        <form action={action} className="mt-2 flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-stone-400">
            Something in the shadows doesn&apos;t add up? Leave it here. Every whisper gets
            investigated.
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-title-input" className={labelClass}>
              Title
            </label>
            <input
              id="report-title-input"
              name="title"
              defaultValue={state?.values?.title}
              placeholder="What did you find?"
              maxLength={REPORT_TITLE_MAX}
              className={inputClass}
              autoFocus
              required
            />
            <FieldErrors errors={state?.errors?.title} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-description" className={labelClass}>
              Description
            </label>
            <textarea
              id="report-description"
              name="description"
              defaultValue={state?.values?.description}
              placeholder="Tell us everything. Where, when, and what felt wrong…"
              maxLength={REPORT_DESCRIPTION_MAX}
              rows={6}
              className={`${inputClass} resize-y bg-[repeating-linear-gradient(transparent,transparent_27px,rgba(127,29,29,0.25)_27px,rgba(127,29,29,0.25)_28px)] bg-local bg-[position:0_8px] leading-7`}
              required
            />
            <FieldErrors errors={state?.errors?.description} />
          </div>

          {state?.message && (
            <p role="alert" className="text-sm text-red-400">
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-sm bg-red-800 px-4 py-2.5 font-mono text-sm font-semibold tracking-widest text-stone-100 uppercase shadow-lg shadow-red-950/60 transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:opacity-60"
          >
            {pending ? "Sealing the envelope…" : "File the report"}
          </button>
        </form>
      )}
    </div>
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
