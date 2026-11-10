import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CaseOrderList } from "@/app/ui/case-order-list";
import { requireAdmin } from "@/lib/dal";
import { listStoryOrder } from "@/lib/stories";

export const metadata: Metadata = { title: "Cases" };

export default function CasesPage() {
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-widest text-amber-200/70 uppercase">Case files</p>
          <h1 className="mt-1 text-2xl font-semibold text-amber-100">Cases</h1>
          <p className="mt-2 text-sm text-stone-400">
            Players work through the active cases from top to bottom. Drag a case to move it.
          </p>
        </div>
        <Link
          href="/dashboard/cases/new"
          className="rounded-md bg-amber-200 px-5 py-2 font-mono text-xs font-semibold tracking-widest text-stone-950 uppercase shadow-lg shadow-black/70 transition hover:bg-amber-100"
        >
          + Add case
        </Link>
      </header>

      <Suspense fallback={<p className="text-sm text-stone-400">Opening the files…</p>}>
        <CaseList />
      </Suspense>
    </>
  );
}

async function CaseList() {
  await requireAdmin();
  // Cases change whenever an admin adds, edits or reorders one, so always read them per request.
  await connection();
  const stories = await listStoryOrder();

  if (!stories.length) {
    return <p className="text-sm text-stone-400">No cases yet. Add the first one to get started.</p>;
  }
  return <CaseOrderList initial={stories} />;
}
