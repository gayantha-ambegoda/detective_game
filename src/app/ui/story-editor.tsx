"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { upload as uploadToBlob } from "@vercel/blob/client";
import { saveStory } from "@/app/actions/story";
import {
  MEDIA_FOLDERS,
  MEDIA_LIMITS,
  STORY_LIMITS,
  type MediaKind,
  type StoryErrors,
  type StoryFact,
  type StoryInput,
  type StoryWitness,
} from "@/lib/definitions";

// Either a picked file with a local preview, or media the story already has in Blob. `url` is
// set once a picked file is uploaded, so a retry after a failed save doesn't upload it again.
type Media = { key: string; kind: MediaKind; name: string; preview: string; file?: File; url?: string };
type PendingMedia = Media & { file: File };
type Evidence = { key: string; id: string; image: Media | null; name: string; description: string };
// Facts are edited one per line for now; `facts` holds the saved ones so unchanged lines keep
// their id and settings.
type Witness = Omit<StoryWitness, "facts"> & { key: string; facts: StoryFact[]; factsText: string };

const inputClass =
  "w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-base text-stone-100 placeholder:text-stone-500 outline-none transition focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/20";
const labelClass = "text-sm font-medium text-stone-300";
const sectionTitle = "font-mono text-xs tracking-widest text-amber-200/70 uppercase";
const ghostButton =
  "rounded-md border border-amber-200/40 bg-stone-950/60 px-3 py-1.5 font-mono text-xs tracking-widest text-amber-100 uppercase transition hover:border-amber-200/70 hover:bg-stone-900/70 disabled:opacity-50";
// Each part of the story sits in its own folder-like card, like the rest of the case files.
const sectionCard = "flex flex-col gap-4 rounded-md border border-white/10 bg-black/30 p-4 sm:p-5";
const rowCard = "rounded-sm border border-amber-900/30 bg-stone-950/70 p-4 shadow-lg shadow-black/40";
const removeButton =
  "rounded-md px-2 py-1 text-xs text-stone-400 transition hover:bg-red-950/40 hover:text-red-300";

const newKey = () => crypto.randomUUID();
const toMedia = (file: File, kind: MediaKind): Media => ({
  key: newKey(),
  kind,
  name: file.name,
  file,
  preview: URL.createObjectURL(file),
});
// Blob adds a random suffix to the name, which is fine to show as is.
const fromUrl = (url: string, kind: MediaKind): Media => ({
  key: newKey(),
  kind,
  name: decodeURIComponent(new URL(url).pathname.split("/").pop() ?? kind),
  preview: url,
  url,
});
const mb = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MB`;

// Each non-empty line is a fact. A line matching a saved fact's text reuses that fact, so its id
// (and anything pointing at it) survives the edit.
function linesToFacts(text: string, saved: StoryFact[]): StoryFact[] {
  const unused = [...saved];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = unused.findIndex((f) => f.text === line);
      if (match !== -1) return unused.splice(match, 1)[0];
      return { id: newKey(), text: line, key: false, revealWhen: "" };
    });
}

function checkFile(file: File, kind: MediaKind) {
  if (!file.type.startsWith(`${kind}/`)) return `"${file.name}" is not ${kind === "image" ? "an image" : "a video"}.`;
  if (file.size > MEDIA_LIMITS[kind]) return `"${file.name}" is larger than ${mb(MEDIA_LIMITS[kind])}.`;
  return null;
}

// Adds a new story, or edits `story` when given. Saving goes back to the cases page.
export function StoryEditor({ story }: { story?: StoryInput & { id: string } }) {
  const [state, dispatch, saving] = useActionState(saveStory, undefined);
  const [title, setTitle] = useState(story?.title ?? "");
  const [subtitle, setSubtitle] = useState(story?.subtitle ?? "");
  const [video, setVideo] = useState<Media | null>(() =>
    story?.introVideoUrl ? fromUrl(story.introVideoUrl, "video") : null,
  );
  const [images, setImages] = useState<Media[]>(() => story?.imageUrls.map((url) => fromUrl(url, "image")) ?? []);
  const [introStory, setIntroStory] = useState(story?.introStory ?? "");
  const [caseStory, setCaseStory] = useState(story?.caseStory ?? "");
  const [evidence, setEvidence] = useState<Evidence[]>(
    () =>
      story?.evidence.map((e) => ({
        key: newKey(),
        id: e.id,
        image: e.imageUrl ? fromUrl(e.imageUrl, "image") : null,
        name: e.name,
        description: e.description,
      })) ?? [],
  );
  const [witnesses, setWitnesses] = useState<Witness[]>(
    () => story?.witnesses.map((w) => ({ key: newKey(), ...w, factsText: w.facts.map((f) => f.text).join("\n") })) ?? [],
  );
  // No editor for these yet; they are saved back unchanged.
  const suspects = story?.suspects ?? [];
  const solution = story?.solution ?? null;
  const [fileError, setFileError] = useState<string | null>(null);
  const [upload, setUpload] = useState<{ done: number; total: number; percent: number } | null>(null);

  // Free the object URLs of whatever is still on screen when the form goes away.
  const live = useRef<Media[]>([]);
  useEffect(() => {
    live.current = [video, ...images, ...evidence.map((e) => e.image)].filter((m): m is Media => !!m);
  });
  useEffect(() => () => live.current.forEach(drop), []);

  const errors: StoryErrors = state?.errors ?? {};
  const busy = saving || upload !== null;

  function pick(files: FileList | null, kind: MediaKind) {
    const picked = Array.from(files ?? []);
    const problem = picked.map((f) => checkFile(f, kind)).find(Boolean);
    setFileError(problem ?? null);
    return problem ? [] : picked.map((f) => toMedia(f, kind));
  }

  // Only picked files have an object URL to free; stored media point at Blob.
  function drop(media: Media | null) {
    if (media?.file) URL.revokeObjectURL(media.preview);
  }

  function updateEvidence(key: string, patch: Partial<Evidence>) {
    setEvidence((list) => list.map((e) => (e.key === key ? { ...e, ...patch } : e)));
  }

  function updateWitness(key: string, patch: Partial<Witness>) {
    setWitnesses((list) => list.map((w) => (w.key === key ? { ...w, ...patch } : w)));
  }

  async function uploadAll() {
    const pending = [video, ...images, ...evidence.map((e) => e.image)].filter(
      (m): m is PendingMedia => !!m?.file && !m.url,
    );
    setUpload({ done: 0, total: pending.length, percent: 0 });
    for (const [i, media] of pending.entries()) {
      // Goes from the browser straight to Vercel Blob; /api/media only signs the upload.
      const blob = await uploadToBlob(`${MEDIA_FOLDERS[media.kind]}/${media.file.name}`, media.file, {
        access: "public",
        handleUploadUrl: "/api/media",
        clientPayload: media.kind,
        contentType: media.file.type,
        // Splits big videos into parts that upload in parallel and retry on their own.
        multipart: media.kind === "video",
        onUploadProgress: ({ percentage }) =>
          setUpload({ done: i, total: pending.length, percent: Math.round(percentage) }),
      }).catch(() => {
        throw new Error(`Could not upload "${media.file.name}". Please try again.`);
      });
      // Media objects are shared with state, so the URL sticks for the next attempt too.
      media.url = blob.url;
      setUpload({ done: i + 1, total: pending.length, percent: 0 });
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFileError(null);
    try {
      await uploadAll();
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Upload failed. Please try again.");
      return;
    } finally {
      setUpload(null);
    }

    startTransition(() =>
      dispatch({
        id: story?.id,
        title,
        subtitle,
        introVideoUrl: video?.url ?? null,
        imageUrls: images.map((m) => m.url),
        introStory,
        caseStory,
        evidence: evidence.map((e) => ({ id: e.id, imageUrl: e.image?.url ?? "", name: e.name, description: e.description })),
        witnesses: witnesses.map((w) => ({
          id: w.id,
          name: w.name,
          attitude: w.attitude,
          suspectId: w.suspectId,
          facts: linesToFacts(w.factsText, w.facts),
          lies: w.lies,
        })),
        suspects,
        solution,
      }),
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <section className={sectionCard}>
        <h2 className={sectionTitle}>Story</h2>
        <Field label="Title" id="title" error={errors.title}>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={STORY_LIMITS.title} className={inputClass} required />
        </Field>
        <Field label="Subtitle" id="subtitle" error={errors.subtitle} optional>
          <input id="subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={STORY_LIMITS.subtitle} className={inputClass} />
        </Field>
      </section>

      <section className={sectionCard}>
        <h2 className={sectionTitle}>Intro video <span className="normal-case tracking-normal text-stone-500">· optional</span></h2>
        {video ? (
          <div className="flex flex-col gap-2">
            <video src={video.preview} controls className="aspect-video w-full rounded-md border border-white/10 bg-black" />
            <div className="flex items-center justify-between gap-3 text-xs text-stone-400">
              <span className="truncate">{video.name}</span>
              <button type="button" className={removeButton} onClick={() => { drop(video); setVideo(null); }}>
                Remove video
              </button>
            </div>
          </div>
        ) : (
          <FilePicker accept="video/*" label="Choose a video" hint={`Up to ${mb(MEDIA_LIMITS.video)}`} onPick={(files) => setVideo(pick(files, "video")[0] ?? null)} />
        )}
      </section>

      <section className={sectionCard}>
        <h2 className={sectionTitle}>Images <span className="normal-case tracking-normal text-stone-500">· {images.length} added</span></h2>
        {images.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((m) => (
              <li key={m.key} className="group relative overflow-hidden rounded-md border border-white/10 bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview or Blob URL */}
                <img src={m.preview} alt={m.name} className="aspect-[4/3] w-full object-cover" />
                <button
                  type="button"
                  aria-label={`Remove ${m.name}`}
                  onClick={() => { drop(m); setImages((list) => list.filter((x) => x.key !== m.key)); }}
                  className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-black/70 text-stone-300 transition hover:bg-red-900 hover:text-white"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        {images.length < STORY_LIMITS.images && (
          <FilePicker accept="image/*" multiple label="Add images" hint={`Select several at once · up to ${mb(MEDIA_LIMITS.image)} each`} onPick={(files) => {
            const added = pick(files, "image");
            setImages((list) => [...list, ...added].slice(0, STORY_LIMITS.images));
          }} />
        )}
        <FieldError error={errors.images} />
      </section>

      <section className={sectionCard}>
        <div>
          <h2 className={sectionTitle}>Intro story <span className="normal-case tracking-normal text-stone-500">· optional</span></h2>
          <p className="mt-1 text-sm text-stone-400">
            Shown with the intro video when players open the case. Leave it empty to show only the video.
          </p>
        </div>
        <Field label="Intro story" id="introStory" error={errors.introStory} hideLabel>
          <textarea
            id="introStory"
            value={introStory}
            onChange={(e) => setIntroStory(e.target.value)}
            maxLength={STORY_LIMITS.introStory}
            rows={6}
            placeholder="Set the scene: the crime, the victim, where and when it happened…"
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </Field>
      </section>

      <section className={sectionCard}>
        <div>
          <h2 className={sectionTitle}>Main story</h2>
          <p className="mt-1 text-sm text-stone-400">
            The complete story, including who did it and how. Players don&apos;t see this.
          </p>
        </div>
        <Field label="Main story" id="caseStory" error={errors.caseStory} hideLabel>
          <textarea
            id="caseStory"
            value={caseStory}
            onChange={(e) => setCaseStory(e.target.value)}
            maxLength={STORY_LIMITS.caseStory}
            rows={10}
            placeholder="What really happened, step by step…"
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </Field>
      </section>

      <section className={sectionCard}>
        <div className="flex items-center justify-between gap-3">
          <h2 className={sectionTitle}>Evidence board <span className="normal-case tracking-normal text-stone-500">· {evidence.length}</span></h2>
          <button type="button" className={ghostButton} disabled={evidence.length >= STORY_LIMITS.evidence}
            onClick={() => setEvidence((list) => [...list, { key: newKey(), id: newKey(), image: null, name: "", description: "" }])}>
            + Add evidence
          </button>
        </div>
        {evidence.length === 0 && <p className="text-sm text-stone-500">No evidence yet.</p>}
        <ol className="flex flex-col gap-3">
          {evidence.map((item, i) => (
            <li key={item.key} className={`grid gap-4 sm:grid-cols-[10rem_1fr] ${rowCard}`}>
              <div className="flex flex-col gap-1">
                {item.image ? (
                  <div className="relative -rotate-2 rounded-sm bg-amber-50/95 p-1.5 pb-5 shadow-lg shadow-black/60 transition hover:rotate-0">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local preview or Blob URL */}
                    <img src={item.image.preview} alt={item.name || `Evidence ${i + 1}`} className="aspect-square w-full object-cover" />
                    <button type="button" aria-label="Change image" onClick={() => { drop(item.image); updateEvidence(item.key, { image: null }); }}
                      className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-black/70 text-stone-300 transition hover:bg-red-900 hover:text-white">
                      ×
                    </button>
                  </div>
                ) : (
                  <FilePicker accept="image/*" label="Add image" compact onPick={(files) => updateEvidence(item.key, { image: pick(files, "image")[0] ?? null })} />
                )}
                <FieldError error={errors[`evidence.${i}.image`]} />
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs tracking-widest text-amber-200/60 uppercase">Exhibit {String(i + 1).padStart(2, "0")}</span>
                  <button type="button" className={removeButton} onClick={() => { drop(item.image); setEvidence((list) => list.filter((e) => e.key !== item.key)); }}>
                    Remove
                  </button>
                </div>
                <Field label="Name" id={`evidence-${item.key}-name`} error={errors[`evidence.${i}.name`]}>
                  <input id={`evidence-${item.key}-name`} value={item.name} maxLength={STORY_LIMITS.evidenceName}
                    onChange={(e) => updateEvidence(item.key, { name: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Description" id={`evidence-${item.key}-description`} error={errors[`evidence.${i}.description`]}>
                  <textarea id={`evidence-${item.key}-description`} value={item.description} rows={3} maxLength={STORY_LIMITS.evidenceDescription}
                    onChange={(e) => updateEvidence(item.key, { description: e.target.value })} className={`${inputClass} resize-y`} />
                </Field>
              </div>
            </li>
          ))}
        </ol>
        <FieldError error={errors.evidence} />
      </section>

      <section className={sectionCard}>
        <div className="flex items-center justify-between gap-3">
          <h2 className={sectionTitle}>Witnesses <span className="normal-case tracking-normal text-stone-500">· {witnesses.length}</span></h2>
          <button type="button" className={ghostButton} disabled={witnesses.length >= STORY_LIMITS.witnesses}
            onClick={() =>
              setWitnesses((list) => [
                ...list,
                { key: newKey(), id: newKey(), name: "", attitude: "", suspectId: null, facts: [], factsText: "", lies: "" },
              ])
            }>
            + Add witness
          </button>
        </div>
        {witnesses.length === 0 && <p className="text-sm text-stone-500">No witnesses yet.</p>}
        <ol className="flex flex-col gap-3">
          {witnesses.map((w, i) => (
            <li key={w.key} className={`flex flex-col gap-3 ${rowCard}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-xs tracking-widest text-amber-200/60 uppercase">Witness {String(i + 1).padStart(2, "0")}</span>
                <button type="button" className={removeButton} onClick={() => setWitnesses((list) => list.filter((x) => x.key !== w.key))}>
                  Remove
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name" id={`witness-${w.key}-name`} error={errors[`witnesses.${i}.name`]}>
                  <input id={`witness-${w.key}-name`} value={w.name} maxLength={STORY_LIMITS.witnessName}
                    onChange={(e) => updateWitness(w.key, { name: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Attitude" id={`witness-${w.key}-attitude`} error={errors[`witnesses.${i}.attitude`]} optional>
                  <input id={`witness-${w.key}-attitude`} value={w.attitude} maxLength={STORY_LIMITS.witnessAttitude}
                    placeholder="Nervous, evasive, eager to help…"
                    onChange={(e) => updateWitness(w.key, { attitude: e.target.value })} className={inputClass} />
                </Field>
              </div>
              <Field
                label="Known information · one fact per line"
                id={`witness-${w.key}-info`}
                error={errors[`witnesses.${i}.facts`] ?? Object.entries(errors).find(([k]) => k.startsWith(`witnesses.${i}.facts.`))?.[1]}
              >
                <textarea id={`witness-${w.key}-info`} value={w.factsText} rows={4} maxLength={STORY_LIMITS.facts * (STORY_LIMITS.factText + 1)}
                  placeholder={"What this witness saw, heard, or knows.\nPut each fact on its own line."}
                  onChange={(e) => updateWitness(w.key, { factsText: e.target.value })} className={`${inputClass} resize-y`} />
              </Field>
            </li>
          ))}
        </ol>
        <FieldError error={errors.witnesses} />
      </section>

      <div className="sticky bottom-0 -mx-6 -mb-6 flex flex-col gap-2 rounded-b-xl border-t border-white/10 bg-stone-950/90 px-6 py-4 backdrop-blur sm:-mx-8 sm:-mb-8 sm:px-8">
        {(fileError || state?.message || state?.errors) && (
          <p role="alert" className="text-sm text-red-400">
            {fileError ??
              state?.message ??
              errors.ids ??
              (Object.keys(errors).some((k) => k.startsWith("solution"))
                ? "The case solution points at a fact or piece of evidence that was removed."
                : "Please fix the highlighted fields.")}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="self-end rounded-md bg-amber-200 px-6 py-3 font-mono text-sm font-semibold tracking-widest text-stone-950 uppercase shadow-lg shadow-black/70 transition hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 disabled:opacity-60"
        >
          {upload ? `Uploading ${Math.min(upload.done + 1, upload.total)} of ${upload.total} · ${upload.percent}%…` : saving ? "Saving…" : story ? "Save changes" : "Save story"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  id,
  error,
  optional,
  hideLabel,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  optional?: boolean;
  hideLabel?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={hideLabel ? "sr-only" : labelClass}>
        {label}
        {optional && <span className="text-stone-500"> · optional</span>}
      </label>
      {children}
      <FieldError error={error} />
    </div>
  );
}

function FieldError({ error }: { error?: string }) {
  return error ? <p className="text-sm text-red-400">{error}</p> : null;
}

function FilePicker({
  accept,
  multiple,
  label,
  hint,
  compact,
  onPick,
}: {
  accept: string;
  multiple?: boolean;
  label: string;
  hint?: string;
  compact?: boolean;
  onPick: (files: FileList | null) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-amber-200/30 bg-black/30 text-center transition hover:border-amber-200/60 hover:bg-black/40 focus-within:border-amber-200/70 ${compact ? "aspect-square p-3" : "px-4 py-8"}`}
    >
      <span className="font-mono text-xs tracking-widest text-amber-100 uppercase">{label}</span>
      {hint && <span className="text-xs text-stone-500">{hint}</span>}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          onPick(e.target.files);
          // Allow picking the same file again after removing it.
          e.target.value = "";
        }}
      />
    </label>
  );
}
