import "server-only";
import { MongoServerError, ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type {
  StoryEvidence,
  StoryInput,
  StorySolution,
  StorySuspect,
  StoryWitness,
} from "@/lib/definitions";

// Stories saved before ids, witness facts, suspects and solutions existed lack those fields.
// storyFromDoc fills them in on read, and the next save stores the full shape.
type StoredEvidence = Omit<StoryEvidence, "id"> & { id?: string };
type StoredWitness = Pick<StoryWitness, "name" | "attitude"> &
  Partial<Omit<StoryWitness, "name" | "attitude">> & { knownInformation?: string };

type StoryDoc = {
  _id: ObjectId;
  title: string;
  subtitle: string;
  // Public Vercel Blob URLs.
  introVideoUrl: string | null;
  imageUrls: string[];
  // Missing on stories saved before intro stories existed.
  introStory?: string;
  // The main story: the complete case, solution included. Admin-only.
  caseStory: string;
  evidence: StoredEvidence[];
  witnesses: StoredWitness[];
  suspects?: StorySuspect[];
  // The answer to the case. Admin-only, like caseStory.
  solution?: StorySolution | null;
  // Stories form a chain in play order; the last story points at null.
  nextStoryId: ObjectId | null;
  // Inactive stories keep their place in the chain but players skip them. Missing means active.
  active?: boolean;
  createdBy: ObjectId;
  createdAt: Date;
};

// One row per user per solved story, kept apart from the stories themselves.
type CompletionDoc = {
  _id: ObjectId;
  userId: ObjectId;
  storyId: ObjectId;
  completedAt: Date;
};

async function storiesCollection() {
  return (await getDb()).collection<StoryDoc>("stories");
}

let completionIndexReady: Promise<string> | undefined;

async function completionsCollection() {
  const completions = (await getDb()).collection<CompletionDoc>("storyCompletions");
  completionIndexReady ??= completions.createIndex({ userId: 1, storyId: 1 }, { unique: true });
  await completionIndexReady;
  return completions;
}

// Callers must check for admin and validate the input (including that the media exist).
// New stories go to the end of the chain.
export async function createStory(input: StoryInput & { userId: string }) {
  const stories = await storiesCollection();
  const _id = new ObjectId();
  await stories.insertOne({
    _id,
    title: input.title,
    subtitle: input.subtitle,
    introVideoUrl: input.introVideoUrl,
    imageUrls: input.imageUrls,
    introStory: input.introStory,
    caseStory: input.caseStory,
    evidence: input.evidence,
    witnesses: input.witnesses,
    suspects: input.suspects,
    solution: input.solution,
    nextStoryId: null,
    createdBy: new ObjectId(input.userId),
    createdAt: new Date(),
  });
  // Point the old last story at this one.
  await stories.updateOne({ _id: { $ne: _id }, nextStoryId: null }, { $set: { nextStoryId: _id } });
  return _id.toHexString();
}

// Brings a stored story up to the current shape. Rows saved without ids get "legacy-…" ids
// derived from their position, so they stay the same on every read until the story is saved
// again, and a witness's old free-text information becomes a single fact.
export function storyFromDoc(story: Omit<StoryDoc, "nextStoryId" | "createdBy" | "createdAt">): StoryInput & { id: string } {
  return {
    id: story._id.toHexString(),
    title: story.title,
    subtitle: story.subtitle,
    introVideoUrl: story.introVideoUrl,
    imageUrls: story.imageUrls,
    introStory: story.introStory ?? "",
    caseStory: story.caseStory,
    evidence: story.evidence.map((e, i) => ({
      id: e.id ?? `legacy-e${i}`,
      imageUrl: e.imageUrl,
      name: e.name,
      description: e.description,
    })),
    witnesses: story.witnesses.map((w, i) => ({
      id: w.id ?? `legacy-w${i}`,
      name: w.name,
      attitude: w.attitude ?? "",
      suspectId: w.suspectId ?? null,
      facts:
        w.facts ??
        (w.knownInformation ? [{ id: `legacy-w${i}-f0`, text: w.knownInformation, key: false, revealWhen: "" }] : []),
      lies: w.lies ?? "",
    })),
    suspects: story.suspects ?? [],
    solution: story.solution ?? null,
  };
}

// The full story, solution included, for the admin editor. Null for an unknown id.
export async function getStoryForEdit(id: string): Promise<(StoryInput & { id: string }) | null> {
  if (!ObjectId.isValid(id)) return null;
  const story = await (await storiesCollection()).findOne({ _id: new ObjectId(id) });
  return story ? storyFromDoc(story) : null;
}

// Every image and video a story uses, for cleaning up Blob after edits and deletes.
const mediaOf = (s: Pick<StoryDoc, "introVideoUrl" | "imageUrls" | "evidence" | "suspects">) =>
  [s.introVideoUrl, ...(s.imageUrls ?? []), ...s.evidence.map((e) => e.imageUrl), ...(s.suspects ?? []).map((x) => x.imageUrl)].filter(
    (u): u is string => typeof u === "string" && u.length > 0,
  );

// Callers must check for admin and validate the input. Keeps the story's place in the chain.
// Returns the media URLs the story no longer uses, or null if the story is gone.
export async function updateStory(id: string, input: StoryInput) {
  if (!ObjectId.isValid(id)) return null;
  const before = await (await storiesCollection()).findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        title: input.title,
        subtitle: input.subtitle,
        introVideoUrl: input.introVideoUrl,
        imageUrls: input.imageUrls,
        introStory: input.introStory,
        caseStory: input.caseStory,
        evidence: input.evidence,
        witnesses: input.witnesses,
        suspects: input.suspects,
        solution: input.solution,
      },
    },
  );
  if (!before) return null;
  const kept = new Set(mediaOf(input));
  return mediaOf(before).filter((url) => !kept.has(url));
}

// Callers must check for admin.
export async function setStoryActive(id: string, active: boolean) {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await storiesCollection()).updateOne({ _id: new ObjectId(id) }, { $set: { active } });
  return result.matchedCount === 1;
}

// Media ids from before stories moved to Vercel Blob, when files lived in GridFS.
type LegacyMedia = {
  introVideoId?: ObjectId | null;
  imageIds?: ObjectId[];
  evidence?: { imageId?: ObjectId }[];
};

// Callers must check for admin. Unlinks the story from the chain, drops its completions and
// returns the media it used so the caller can delete them, or null if it was already gone.
export async function deleteStory(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const _id = new ObjectId(id);
  const stories = await storiesCollection();
  const story = await stories.findOneAndDelete({ _id });
  if (!story) return null;

  await Promise.all([
    // Whatever pointed at this story now points at the one after it.
    stories.updateMany({ nextStoryId: _id }, { $set: { nextStoryId: story.nextStoryId } }),
    (await completionsCollection()).deleteMany({ storyId: _id }),
  ]);

  const legacy = story as LegacyMedia;
  return {
    urls: mediaOf(story),
    gridFsIds: [legacy.introVideoId, ...(legacy.imageIds ?? []), ...(legacy.evidence ?? []).map((e) => e.imageId)].filter(
      (v): v is ObjectId => v instanceof ObjectId,
    ),
  };
}

export type StoryOrderItem = { id: string; title: string; subtitle: string; active: boolean };

// Walks the chain from its head. Anything the walk misses (a broken or looping chain) is
// appended oldest first, so every story still shows up and the next save repairs the links.
export async function listStoryOrder(): Promise<StoryOrderItem[]> {
  const stories = await (await storiesCollection())
    .find({}, { projection: { title: 1, subtitle: 1, nextStoryId: 1, active: 1, createdAt: 1 } })
    .sort({ createdAt: 1 })
    .toArray();

  const byId = new Map(stories.map((s) => [s._id.toHexString(), s]));
  const pointedAt = new Set(stories.map((s) => s.nextStoryId?.toHexString()));
  const ordered: typeof stories = [];
  const seen = new Set<string>();

  for (const start of [...stories.filter((s) => !pointedAt.has(s._id.toHexString())), ...stories]) {
    let story: (typeof stories)[number] | undefined = start;
    while (story && !seen.has(story._id.toHexString())) {
      seen.add(story._id.toHexString());
      ordered.push(story);
      story = story.nextStoryId ? byId.get(story.nextStoryId.toHexString()) : undefined;
    }
  }

  return ordered.map((s) => ({
    id: s._id.toHexString(),
    title: s.title,
    subtitle: s.subtitle,
    active: s.active !== false,
  }));
}

export class StoryOrderOutdatedError extends Error {}

// Rewrites every link to match `ids`. Callers must check for admin. Fails if `ids` isn't
// exactly the current set of stories (say, another admin added one meanwhile).
export async function reorderStories(ids: string[]) {
  const current = await listStoryOrder();
  const currentIds = new Set(current.map((s) => s.id));
  if (ids.length !== currentIds.size || new Set(ids).size !== ids.length || !ids.every((id) => currentIds.has(id))) {
    throw new StoryOrderOutdatedError();
  }
  if (!ids.length) return;

  await (await storiesCollection()).bulkWrite(
    ids.map((id, i) => ({
      updateOne: {
        filter: { _id: new ObjectId(id) },
        update: { $set: { nextStoryId: i + 1 < ids.length ? new ObjectId(ids[i + 1]) : null } },
      },
    })),
  );
}

export type StoryView = {
  id: string;
  title: string;
  subtitle: string;
  introVideoUrl: string | null;
  imageUrls: string[];
  // Only the intro: the main story would give the case away.
  introStory: string;
  evidence: StoryEvidence[];
  // Until interrogation exists, players read what each witness knows straight away. Lies and
  // which facts are key stay hidden.
  witnesses: { id: string; name: string; attitude: string; knownInformation: string }[];
  // 1-based place among the active stories, for "Case 3 of 7".
  position: number;
  total: number;
};

// The first active story in play order this user hasn't completed, or null when they've solved
// them all.
export async function getNextStoryForUser(userId: string): Promise<StoryView | null> {
  const [order, completions] = await Promise.all([
    listStoryOrder().then((list) => list.filter((s) => s.active)),
    completionsCollection().then((c) =>
      c.find({ userId: new ObjectId(userId) }, { projection: { storyId: 1 } }).toArray(),
    ),
  ]);
  const done = new Set(completions.map((c) => c.storyId.toHexString()));
  const index = order.findIndex((s) => !done.has(s.id));
  if (index === -1) return null;

  const story = await (await storiesCollection()).findOne(
    { _id: new ObjectId(order[index].id), active: { $ne: false } },
    { projection: { caseStory: 0, solution: 0 } },
  );
  if (!story) return null;
  const view = storyFromDoc(story);

  return {
    id: view.id,
    title: view.title,
    subtitle: view.subtitle,
    introVideoUrl: view.introVideoUrl,
    imageUrls: view.imageUrls,
    introStory: view.introStory,
    evidence: view.evidence,
    witnesses: view.witnesses.map((w) => ({
      id: w.id,
      name: w.name,
      attitude: w.attitude,
      knownInformation: w.facts.map((f) => f.text).join("\n"),
    })),
    position: index + 1,
    total: order.length,
  };
}

export type SolvedStory = StoryOrderItem & { completedAt: Date };

// The stories this user has closed, in play order, plus how many active cases there are in all.
export async function listSolvedStoriesForUser(userId: string) {
  const [order, completions] = await Promise.all([
    listStoryOrder(),
    completionsCollection().then((c) =>
      c.find({ userId: new ObjectId(userId) }, { projection: { storyId: 1, completedAt: 1 } }).toArray(),
    ),
  ]);
  const completedAt = new Map(completions.map((c) => [c.storyId.toHexString(), c.completedAt]));
  const solved: SolvedStory[] = order.flatMap((s) => {
    const at = completedAt.get(s.id);
    return at ? [{ ...s, completedAt: at }] : [];
  });
  return { solved, total: order.filter((s) => s.active).length };
}

export async function recordStoryCompletion(userId: string, storyId: string) {
  const completions = await completionsCollection();
  try {
    await completions.insertOne({
      _id: new ObjectId(),
      userId: new ObjectId(userId),
      storyId: new ObjectId(storyId),
      completedAt: new Date(),
    });
  } catch (error) {
    // Already completed (e.g. a double click): keep the first completion time.
    if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
  }
}
