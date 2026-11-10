import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StoryEditor } from "@/app/ui/story-editor";
import { requireAdmin } from "@/lib/dal";

export const metadata: Metadata = { title: "Add case" };

export default function NewCasePage() {
  return (
    <>
      <header>
        <Link href="/dashboard/cases" className="font-mono text-xs tracking-widest text-amber-200/70 uppercase transition hover:text-amber-100">
          Case files · Cases
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-amber-100">Add a case</h1>
        <p className="mt-2 text-sm text-stone-400">New cases go to the end of the case order.</p>
      </header>

      <Suspense fallback={null}>
        <AdminStoryEditor />
      </Suspense>
    </>
  );
}

async function AdminStoryEditor() {
  await requireAdmin();
  return <StoryEditor />;
}
