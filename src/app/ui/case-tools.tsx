"use client";

import { useRef } from "react";

type Evidence = { imageUrl: string; name: string; description: string };
type Witness = { name: string; attitude: string; knownInformation: string };

const toolButton =
  "group flex w-32 flex-col items-center gap-2 rounded-md border border-amber-200/30 bg-stone-950/60 px-4 py-4 text-amber-100 shadow-lg shadow-black/60 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-amber-200/70 hover:bg-stone-900/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200";
const toolLabel = "font-mono text-xs tracking-widest uppercase";

// Icon buttons for the case's evidence board and witness list, each opening its own popup.
// A button only appears when the case has something to show behind it.
export function CaseTools({ evidence, witnesses }: { evidence: Evidence[]; witnesses: Witness[] }) {
  const evidenceRef = useRef<HTMLDialogElement>(null);
  const witnessRef = useRef<HTMLDialogElement>(null);

  if (!evidence.length && !witnesses.length) return null;

  return (
    <>
      <div className="flex flex-wrap justify-center gap-4">
        {evidence.length > 0 && (
          <button type="button" className={toolButton} onClick={() => evidenceRef.current?.showModal()}>
            <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="size-9 transition group-hover:scale-110">
              <rect x="3" y="4" width="18" height="16" rx="1.5" />
              <path d="M7 8h4v4H7zM14 9h3M14 12h3M7 15h10" />
              <circle cx="9" cy="6.2" r="0.6" fill="currentColor" />
            </svg>
            <span className={toolLabel}>Evidence</span>
            <span className="font-mono text-[10px] text-stone-400">{evidence.length} {evidence.length === 1 ? "item" : "items"}</span>
          </button>
        )}
        {witnesses.length > 0 && (
          <button type="button" className={toolButton} onClick={() => witnessRef.current?.showModal()}>
            <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="size-9 transition group-hover:scale-110">
              <circle cx="9" cy="8" r="3.5" />
              <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
              <circle cx="17" cy="9" r="2.5" />
              <path d="M16.5 14.2A5 5 0 0 1 21.5 19" />
            </svg>
            <span className={toolLabel}>Witnesses</span>
            <span className="font-mono text-[10px] text-stone-400">{witnesses.length} {witnesses.length === 1 ? "person" : "people"}</span>
          </button>
        )}
      </div>

      <CasePopup dialogRef={evidenceRef} id="evidence-title" kicker="Case file · Evidence" title="Evidence board">
        <ul className="grid gap-5 rounded-md border border-amber-900/30 bg-amber-950/20 p-4 sm:grid-cols-2 sm:p-5">
          {evidence.map((item, i) => (
            <li
              key={i}
              className={`flex flex-col gap-2 rounded-sm bg-amber-50/95 p-2 pb-3 text-stone-900 shadow-lg shadow-black/60 transition hover:rotate-0 ${i % 2 ? "rotate-1" : "-rotate-1"}`}
            >
              {/* Served straight from the public Blob store. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt={item.name} loading="lazy" className="aspect-square w-full object-cover" />
              <p className="px-1 font-mono text-sm font-semibold tracking-wide uppercase">{item.name}</p>
              <p className="px-1 text-sm leading-snug whitespace-pre-wrap break-words text-stone-700">{item.description}</p>
            </li>
          ))}
        </ul>
      </CasePopup>

      <CasePopup dialogRef={witnessRef} id="witness-title" kicker="Case file · Statements" title="Witnesses">
        <ul className="flex flex-col gap-3">
          {witnesses.map((w, i) => (
            <li key={i} className="rounded-md border border-white/10 bg-black/40 p-4">
              <p className="font-semibold break-words text-amber-100">{w.name}</p>
              {w.attitude && <p className="mt-0.5 text-sm text-stone-400 italic">{w.attitude}</p>}
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap break-words text-stone-300">{w.knownInformation}</p>
            </li>
          ))}
        </ul>
      </CasePopup>
    </>
  );
}

function CasePopup({
  dialogRef,
  id,
  kicker,
  title,
  children,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  id: string;
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={id}
      // Clicking the dimmed backdrop (the dialog element itself) closes it.
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-xl border border-white/10 bg-stone-950/95 p-0 text-stone-100 shadow-2xl shadow-black/70 backdrop:bg-black/80 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-5 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-widest text-amber-200/70 uppercase">{kicker}</p>
            <h2 id={id} className="mt-1 text-2xl font-semibold text-amber-100">{title}</h2>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="-mt-1 -mr-2 grid size-9 shrink-0 place-items-center rounded-full text-stone-400 transition hover:bg-white/5 hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-amber-200"
          >
            <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
