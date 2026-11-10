import Image from "next/image";
import Link from "next/link";
import background from "../../../public/images/background_1.png";

// Same backdrop and frosted panel as the dashboard and auth screens, so inner pages feel like
// part of the game rather than a separate back office. The backdrop is pinned to the viewport
// so long pages scroll over it instead of stretching it.
export function CaseFileShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative isolate flex-1 bg-black px-4 py-8 text-stone-100 sm:py-16">
      <div aria-hidden className="fixed inset-0 -z-10">
        <Image
          src={background}
          alt=""
          fill
          preload
          placeholder="blur"
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.15)_0%,rgba(0,0,0,0.65)_100%)]" />
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-xl border border-white/10 bg-stone-950/60 p-6 shadow-2xl shadow-black/60 backdrop-blur-md sm:p-8">
        <Link
          href="/dashboard"
          className="self-start font-mono text-xs tracking-widest text-amber-200/70 uppercase transition hover:text-amber-100"
        >
          ← Back to dashboard
        </Link>
        {children}
      </div>
    </main>
  );
}
