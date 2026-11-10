"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { changeStoryActive, removeStory, saveStoryOrder } from "@/app/actions/story";
import type { StoryOrderItem } from "@/lib/stories";

const rowAction =
  "rounded-md px-2 py-1 font-mono text-[11px] tracking-widest uppercase transition disabled:opacity-40";
const moveButton =
  "grid size-8 place-items-center rounded-md text-stone-400 transition hover:bg-white/5 hover:text-amber-100 disabled:opacity-30 disabled:hover:bg-transparent";

function move<T>(list: T[], from: number, to: number) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// Drag and drop for pointers; the arrow buttons cover keyboards and touch screens,
// where native drag and drop doesn't work.
export function CaseOrderList({ initial }: { initial: StoryOrderItem[] }) {
  const [saved, setSaved] = useState(initial);
  const [items, setItems] = useState(initial);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, startSaving] = useTransition();
  const [changing, startChanging] = useTransition();
  const [deleting, setDeleting] = useState<StoryOrderItem | null>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);

  const busy = saving || changing;
  const dirty = items.some((item, i) => item.id !== saved[i]?.id);

  // Applied to both lists so an unsaved reorder survives the change.
  function updateBoth(change: (list: StoryOrderItem[]) => StoryOrderItem[]) {
    setItems(change);
    setSaved(change);
  }

  function toggleActive(story: StoryOrderItem) {
    startChanging(async () => {
      const res = await changeStoryActive(story.id, !story.active);
      if (!res.ok) return setResult(res);
      updateBoth((list) => list.map((s) => (s.id === story.id ? { ...s, active: !story.active } : s)));
      setResult({
        ok: true,
        message: story.active
          ? `“${story.title}” is deactivated. Players skip it until you activate it again.`
          : `“${story.title}” is active again.`,
      });
    });
  }

  function askDelete(story: StoryOrderItem) {
    setDeleting(story);
    deleteDialog.current?.showModal();
  }

  function confirmDelete() {
    if (!deleting) return;
    const story = deleting;
    startChanging(async () => {
      const res = await removeStory(story.id);
      deleteDialog.current?.close();
      if (!res.ok) return setResult(res);
      updateBoth((list) => list.filter((s) => s.id !== story.id));
      setResult({ ok: true, message: `“${story.title}” and its images and video were deleted.` });
    });
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    setItems((list) => move(list, from, to));
    setResult(null);
  }

  function save() {
    startSaving(async () => {
      const res = await saveStoryOrder(items.map((s) => s.id));
      if (res.ok) {
        setSaved(items);
        setResult({ ok: true, message: "Case order saved." });
      } else {
        setResult(res);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-2">
        {items.map((story, i) => (
          <li
            key={story.id}
            draggable={!busy}
            onDragStart={(e) => {
              setDragIndex(i);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              if (dragIndex === null) return;
              e.preventDefault();
              setOverIndex(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null) reorder(dragIndex, i);
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            className={`flex cursor-grab items-center gap-3 rounded-md border p-3 transition active:cursor-grabbing ${
              story.active ? "bg-black/40" : "bg-black/20"
            } ${
              dragIndex === i
                ? "border-amber-200/20 opacity-40"
                : overIndex === i && dragIndex !== null
                  ? "border-amber-200/70 bg-amber-200/10"
                  : "border-white/10 hover:border-white/20"
            }`}
          >
            <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className="size-5 shrink-0 text-stone-600">
              <circle cx="9" cy="6" r="1.5" />
              <circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" />
              <circle cx="15" cy="18" r="1.5" />
            </svg>
            <span className="shrink-0 font-mono whitespace-nowrap text-xs tracking-widest text-amber-200/70 uppercase">
              Case {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className={`truncate font-semibold ${story.active ? "text-amber-100" : "text-stone-500"}`}>{story.title}</p>
                {!story.active && (
                  <span className="shrink-0 rounded-sm border border-stone-600 px-1.5 py-0.5 font-mono text-[10px] tracking-widest text-stone-400 uppercase">
                    Inactive
                  </span>
                )}
              </div>
              {story.subtitle && <p className="truncate text-sm text-stone-400">{story.subtitle}</p>}
              <div className="mt-1 -ml-2 flex flex-wrap gap-1">
                <Link
                  href={`/dashboard/cases/${story.id}/edit`}
                  draggable={false}
                  aria-label={`Edit ${story.title}`}
                  className={`${rowAction} text-amber-100 hover:bg-white/5`}
                >
                  Edit
                </Link>
                <button type="button" disabled={busy} onClick={() => toggleActive(story)}
                  aria-label={`${story.active ? "Deactivate" : "Activate"} ${story.title}`}
                  className={`${rowAction} ${story.active ? "text-stone-300 hover:bg-white/5" : "text-emerald-300 hover:bg-emerald-950/40"}`}>
                  {story.active ? "Deactivate" : "Activate"}
                </button>
                <button type="button" disabled={busy} onClick={() => askDelete(story)}
                  aria-label={`Delete ${story.title}`}
                  className={`${rowAction} text-red-300/80 hover:bg-red-950/40 hover:text-red-300`}>
                  Delete
                </button>
              </div>
            </div>
            <div className="flex shrink-0 items-center">
              <button type="button" className={moveButton} aria-label={`Move ${story.title} up`}
                disabled={i === 0 || busy} onClick={() => reorder(i, i - 1)}>
                ↑
              </button>
              <button type="button" className={moveButton} aria-label={`Move ${story.title} down`}
                disabled={i === items.length - 1 || busy} onClick={() => reorder(i, i + 1)}>
                ↓
              </button>
            </div>
          </li>
        ))}
      </ol>
      {items.length === 0 && <p className="text-sm text-stone-400">No cases left. Add one to get started.</p>}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {result && (
          <p role={result.ok ? "status" : "alert"} className={`mr-auto text-sm ${result.ok ? "text-emerald-300" : "text-red-400"}`}>
            {result.message}
          </p>
        )}
        <button
          type="button"
          disabled={!dirty || busy}
          onClick={() => {
            setItems(saved);
            setResult(null);
          }}
          className="rounded-md border border-amber-200/40 px-4 py-2 font-mono text-xs tracking-widest text-amber-100 uppercase transition hover:border-amber-200/70 disabled:opacity-40"
        >
          Undo changes
        </button>
        <button
          type="button"
          disabled={!dirty || busy}
          onClick={save}
          className="rounded-md bg-amber-200 px-5 py-2 font-mono text-xs font-semibold tracking-widest text-stone-950 uppercase transition hover:bg-amber-100 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save order"}
        </button>
      </div>

      <dialog
        ref={deleteDialog}
        aria-labelledby="delete-case-title"
        onClose={() => setDeleting(null)}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-sm border border-red-900/50 bg-stone-950 p-6 text-stone-100 shadow-2xl shadow-red-950/50 backdrop:bg-black/80 backdrop:backdrop-blur-sm"
      >
        <p className="font-mono text-xs tracking-[0.3em] text-red-500/80 uppercase">Delete case</p>
        <h2 id="delete-case-title" className="mt-2 text-xl font-semibold break-words text-amber-100">
          Delete “{deleting?.title}”?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-300">
          This removes the case, its images and video, and every player&apos;s progress on it. It can&apos;t
          be undone. To hide it from players for now, deactivate it instead.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" disabled={changing} onClick={() => deleteDialog.current?.close()}
            className="rounded-md border border-amber-200/40 px-4 py-2 font-mono text-xs tracking-widest text-amber-100 uppercase transition hover:border-amber-200/70 disabled:opacity-40">
            Cancel
          </button>
          <button type="button" disabled={changing} onClick={confirmDelete}
            className="rounded-md bg-red-700 px-4 py-2 font-mono text-xs font-semibold tracking-widest text-white uppercase transition hover:bg-red-600 disabled:opacity-60">
            {changing ? "Deleting…" : "Delete case"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
