"use server";

import { redirect } from "next/navigation";
import {
  ID_RE,
  validateStory,
  type StoryFormState,
  type StoryInput,
  type StorySolution,
} from "@/lib/definitions";
import { getAdminId } from "@/lib/dal";
import { deleteLegacyMedia, deleteMedia, mediaExists } from "@/lib/media";
import { getSession } from "@/lib/session";
import {
  createStory,
  deleteStory,
  getNextStoryForUser,
  recordStoryCompletion,
  reorderStories,
  setStoryActive,
  StoryOrderOutdatedError,
  updateStory,
} from "@/lib/stories";

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const list = (value: unknown) => (Array.isArray(value) ? value : []);
// Keeps a row's id so references to it survive the save; rows without a usable one get a new id.
const rowId = (value: unknown) => {
  const id = text(value);
  return ID_RE.test(id) ? id : crypto.randomUUID();
};

function parseSolution(value: unknown): StorySolution | null {
  if (!value || typeof value !== "object") return null;
  const s = value as Record<string, unknown>;
  return {
    culpritSuspectId: text(s.culpritSuspectId),
    requiredProof: list(s.requiredProof).map((p) => ({
      kind: p?.kind === "fact" ? "fact" : "evidence",
      id: text(p?.id),
    })),
    minProof: Number(s.minProof),
    motiveOptions: list(s.motiveOptions).map((m) => ({ id: rowId(m?.id), text: text(m?.text) })),
    correctMotiveId: text(s.correctMotiveId),
    motiveSummary: text(s.motiveSummary),
  };
}

// Takes plain data rather than FormData: the editor uploads files to Vercel Blob first and
// sends their URLs here, which keeps large videos out of the action body. With an `id` it
// updates that story; without one it adds a new story at the end of the case order.
export async function saveStory(_state: StoryFormState, raw: unknown): Promise<StoryFormState> {
  const adminId = await getAdminId();
  if (!adminId) return { message: "Only admins can edit stories." };

  const data = (raw ?? {}) as Record<string, unknown>;
  const id = text(data.id);
  const input: StoryInput = {
    title: text(data.title),
    subtitle: text(data.subtitle),
    introVideoUrl: text(data.introVideoUrl) || null,
    imageUrls: list(data.imageUrls).map(text).filter(Boolean),
    introStory: text(data.introStory),
    caseStory: text(data.caseStory),
    evidence: list(data.evidence).map((e) => ({
      id: rowId(e?.id),
      imageUrl: text(e?.imageUrl),
      name: text(e?.name),
      description: text(e?.description),
    })),
    witnesses: list(data.witnesses).map((w) => ({
      id: rowId(w?.id),
      name: text(w?.name),
      attitude: text(w?.attitude),
      suspectId: text(w?.suspectId) || null,
      facts: list(w?.facts).map((f) => ({
        id: rowId(f?.id),
        text: text(f?.text),
        key: f?.key === true,
        revealWhen: text(f?.revealWhen),
      })),
      lies: text(w?.lies),
    })),
    suspects: list(data.suspects).map((s) => ({
      id: rowId(s?.id),
      name: text(s?.name),
      description: text(s?.description),
      imageUrl: text(s?.imageUrl) || null,
    })),
    solution: parseSolution(data.solution),
  };

  const errors = validateStory(input);
  if (errors) return { errors };

  try {
    const imageUrls = [
      ...input.imageUrls,
      ...input.evidence.map((e) => e.imageUrl),
      ...input.suspects.flatMap((s) => (s.imageUrl ? [s.imageUrl] : [])),
    ];
    const [videoOk, imagesOk] = await Promise.all([
      mediaExists(input.introVideoUrl ? [input.introVideoUrl] : [], "video"),
      mediaExists(imageUrls, "image"),
    ]);
    if (!videoOk || !imagesOk) {
      return { message: "Some uploaded files could not be found. Please add them again." };
    }
    if (id) {
      const unused = await updateStory(id, input);
      if (!unused) return { message: "This story no longer exists." };
      await deleteMedia(unused);
    } else {
      await createStory({ ...input, userId: adminId });
    }
  } catch (error) {
    console.error("save story failed", error);
    return { message: "Could not save the story. Please try again." };
  }
  redirect("/dashboard/cases");
}

export type StoryOrderResult = { ok: true } | { ok: false; message: string };

export async function saveStoryOrder(ids: unknown): Promise<StoryOrderResult> {
  if (!(await getAdminId())) return { ok: false, message: "Only admins can change the case order." };
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
    return { ok: false, message: "That order could not be read." };
  }

  try {
    await reorderStories(ids);
    return { ok: true };
  } catch (error) {
    if (error instanceof StoryOrderOutdatedError) {
      return { ok: false, message: "Stories changed since you opened this page. Reload and try again." };
    }
    console.error("reorder stories failed", error);
    return { ok: false, message: "Could not save the order. Please try again." };
  }
}

export type StoryChangeResult = { ok: true } | { ok: false; message: string };

// Inactive stories stay in the case order, but players skip them until they are activated again.
export async function changeStoryActive(id: unknown, active: unknown): Promise<StoryChangeResult> {
  if (!(await getAdminId())) return { ok: false, message: "Only admins can change cases." };
  if (typeof id !== "string" || typeof active !== "boolean") {
    return { ok: false, message: "That change could not be read." };
  }
  try {
    if (!(await setStoryActive(id, active))) return { ok: false, message: "This case no longer exists." };
    return { ok: true };
  } catch (error) {
    console.error("change story active failed", error);
    return { ok: false, message: "Could not update the case. Please try again." };
  }
}

// Deletes the story, everyone's completion of it, and every image and video it used.
export async function removeStory(id: unknown): Promise<StoryChangeResult> {
  if (!(await getAdminId())) return { ok: false, message: "Only admins can delete cases." };
  if (typeof id !== "string") return { ok: false, message: "That case could not be read." };
  try {
    const media = await deleteStory(id);
    if (!media) return { ok: false, message: "This case no longer exists." };
    await Promise.all([deleteMedia(media.urls), deleteLegacyMedia(media.gridFsIds)]);
    return { ok: true };
  } catch (error) {
    console.error("delete story failed", error);
    return { ok: false, message: "Could not delete the case. Please try again." };
  }
}

export async function completeStory(storyId: string) {
  // Re-read the session here rather than trusting anything from the client.
  const session = await getSession();
  if (!session?.userId) redirect("/signin");

  // Only the case the player is on can be closed, so stories can't be skipped.
  const next = await getNextStoryForUser(session.userId);
  if (next?.id === storyId) await recordStoryCompletion(session.userId, storyId);
  redirect("/dashboard/investigate");
}
