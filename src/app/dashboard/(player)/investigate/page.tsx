import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { completeStory } from "@/app/actions/story";
import { CaseIntro } from "@/app/ui/case-intro";
import { CaseTools } from "@/app/ui/case-tools";
import { getCurrentUser } from "@/lib/dal";
import { getNextStoryForUser } from "@/lib/stories";

export const metadata: Metadata = { title: "Investigate" };

export default function InvestigatePage() {
  return (
    <Suspense fallback={<p className="text-sm text-stone-400">Opening the case file…</p>}>
      <NextCase />
    </Suspense>
  );
}

const sectionTitle = "font-mono text-xs tracking-widest text-amber-200/70 uppercase";

async function NextCase() {
  const user = await getCurrentUser();
  // Progress changes as cases are closed, so always read it per request.
  await connection();
  const story = await getNextStoryForUser(user.id);

  if (!story) {
    return (
      <header className="py-8 text-center">
        <p className={sectionTitle}>Case files</p>
        <h1 className="mt-2 text-2xl font-semibold text-amber-100">No open cases</h1>
        <p className="mt-2 text-sm text-stone-400">
          You&apos;re all caught up. Check back when new cases come in.
        </p>
      </header>
    );
  }

  const introStory = story.introStory.trim();
  // Only what the case actually has: a video, a text, both, or no intro at all.
  const intro =
    story.introVideoUrl || introStory ? (
      <>
        <h1 className="text-3xl font-semibold break-words text-amber-100">{story.title}</h1>
        {story.introVideoUrl && (
          <video
            src={story.introVideoUrl}
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full rounded-md border border-white/10 bg-black"
          />
        )}
        {introStory && (
          <p className="leading-relaxed whitespace-pre-wrap break-words text-stone-200">{introStory}</p>
        )}
      </>
    ) : null;

  return (
    <CaseIntro intro={intro}>
      <header>
        <p className={sectionTitle}>
          Case {String(story.position).padStart(2, "0")} of {String(story.total).padStart(2, "0")}
        </p>
        <h1 className="mt-1 text-3xl font-semibold break-words text-amber-100">{story.title}</h1>
        {story.subtitle && <p className="mt-1 text-stone-300">{story.subtitle}</p>}
      </header>

      {story.imageUrls.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {story.imageUrls.map((url) => (
            <li key={url} className="overflow-hidden rounded-md border border-white/10 bg-black/40">
              {/* Served straight from the public Blob store. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
            </li>
          ))}
        </ul>
      )}

      <CaseTools evidence={story.evidence} witnesses={story.witnesses} />

      {/* Placeholder until the solving rules are decided: closing a case moves on to the next. */}
      <form action={completeStory.bind(null, story.id)} className="flex justify-end border-t border-white/10 pt-6">
        <button
          type="submit"
          className="rounded-md bg-amber-200 px-6 py-3 font-mono text-sm font-semibold tracking-widest text-stone-950 uppercase shadow-lg shadow-black/70 transition hover:bg-amber-100"
        >
          Close case
        </button>
      </form>
    </CaseIntro>
  );
}
