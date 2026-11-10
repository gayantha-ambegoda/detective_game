"use client";

import { useState } from "react";

// Shows the case intro first and the case itself after "Continue". Cases without
// an intro (no video and no intro story) go straight to the case.
export function CaseIntro({ intro, children }: { intro: React.ReactNode | null; children: React.ReactNode }) {
  const [started, setStarted] = useState(!intro);

  if (!started) {
    return (
      <div className="flex flex-col gap-6">
        {intro}
        <button
          type="button"
          onClick={() => {
            setStarted(true);
            window.scrollTo({ top: 0 });
          }}
          className="self-center rounded-md bg-amber-200 px-6 py-3 font-mono text-sm font-semibold tracking-widest text-stone-950 uppercase shadow-lg shadow-black/70 transition hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {intro && (
        <button
          type="button"
          onClick={() => setStarted(false)}
          className="self-start font-mono text-xs tracking-widest text-amber-200/70 uppercase transition hover:text-amber-100"
        >
          ↺ Replay intro
        </button>
      )}
      {children}
    </div>
  );
}
