import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { StoryEditor } from "@/app/ui/story-editor";
import { requireAdmin } from "@/lib/dal";
import { getStoryForEdit } from "@/lib/stories";

export const metadata: Metadata = { title: "Edit case" };

export default function EditCasePage({ params }: PageProps<"/dashboard/cases/[id]/edit">) {
  return (
    <>
      <header>
        <Link href="/dashboard/cases" className="font-mono text-xs tracking-widest text-amber-200/70 uppercase transition hover:text-amber-100">
          Case files · Cases
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-amber-100">Edit case</h1>
      </header>

      <Suspense fallback={<p className="text-sm text-stone-400">Opening the file…</p>}>
        <AdminStoryEditor params={params} />
      </Suspense>
    </>
  );
}

async function AdminStoryEditor({ params }: Pick<PageProps<"/dashboard/cases/[id]/edit">, "params">) {
  await requireAdmin();
  // Always edit the latest saved version.
  await connection();
  const story = await getStoryForEdit((await params).id);
  if (!story) notFound();
  return <StoryEditor story={story} />;
}
