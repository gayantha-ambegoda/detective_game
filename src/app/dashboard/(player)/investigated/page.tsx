import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/dal";
import { listSolvedStoriesForUser } from "@/lib/stories";

export const metadata: Metadata = { title: "Investigated cases" };

const sectionTitle = "font-mono text-xs tracking-widest text-amber-200/70 uppercase";
const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export default function InvestigatedPage() {
  return (
    <>
      <header>
        <p className={sectionTitle}>Case files · Closed</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-100">Investigated cases</h1>
      </header>

      <Suspense fallback={<p className="text-sm text-stone-400">Opening the files…</p>}>
        <SolvedList />
      </Suspense>
    </>
  );
}

async function SolvedList() {
  const user = await getCurrentUser();
  // Progress changes as cases are closed, so always read it per request.
  await connection();
  const { solved, total } = await listSolvedStoriesForUser(user.id);

  if (!solved.length) {
    return (
      <p className="text-sm text-stone-400">
        You haven&apos;t closed any cases yet.{" "}
        <Link href="/dashboard/investigate" className="text-amber-200 underline hover:text-amber-100">
          Start investigating
        </Link>
        .
      </p>
    );
  }

  const solvedActive = solved.filter((s) => s.active).length;
  return (
    <>
      <p className="text-sm text-stone-400">
        {solvedActive} of {total} cases closed.
      </p>
      <ol className="flex flex-col gap-2">
        {solved.map((story) => (
          <li key={story.id} className="flex items-center gap-3 rounded-md border border-white/10 bg-black/40 p-3">
            <span
              aria-hidden
              className="grid size-8 shrink-0 place-items-center rounded-full border border-emerald-400/40 bg-emerald-950/50 text-emerald-300"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="size-4">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-amber-100">
                <span className="sr-only">Closed: </span>
                {story.title}
              </p>
              {story.subtitle && <p className="truncate text-sm text-stone-400">{story.subtitle}</p>}
            </div>
            <time dateTime={story.completedAt.toISOString()} className="shrink-0 font-mono text-xs text-stone-500">
              {dateFormat.format(story.completedAt)}
            </time>
          </li>
        ))}
      </ol>
    </>
  );
}
