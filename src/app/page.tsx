import Image from "next/image";
import Link from "next/link";
import background from "../../public/images/landing_page_back.png";

const features = [
  { title: "Examine clues", body: "Comb through photos, notes and maps for what doesn't fit." },
  { title: "Question suspects", body: "Every alibi has a crack. Find it before the trail goes cold." },
  { title: "Close the case", body: "Connect the evidence and name the culprit." },
];

export default function Home() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-black text-stone-100">
      <Image
        src={background}
        alt=""
        fill
        preload
        placeholder="blur"
        sizes="100vw"
        className="-z-10 object-cover object-center"
      />
      {/* Darken the left side so the copy reads over the evidence board */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/60 to-black/10"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-transparent to-black/40"
      />

      <header className="flex items-center justify-between gap-4 px-6 py-5 sm:px-12">
        <span className="font-serif text-base tracking-[0.2em] whitespace-nowrap text-amber-200/90 uppercase sm:text-lg sm:tracking-[0.3em]">
          Detective Game
        </span>
        <Link
          href="/signin"
          className="text-sm whitespace-nowrap text-stone-300 transition hover:text-amber-200"
        >
          Sign in
        </Link>
      </header>

      <section className="flex flex-1 items-center px-6 sm:px-12">
        <div className="max-w-xl">
          <p className="mb-4 text-xs font-medium tracking-[0.35em] text-amber-300/80 uppercase">
            A new case awaits
          </p>
          <h1 className="font-serif text-4xl leading-tight font-semibold text-stone-50 sm:text-6xl">
            Truth always finds a way.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-stone-300 sm:text-lg">
            Step into a rain-soaked city where every case is a puzzle. Gather
            evidence, interrogate suspects and piece together the story hidden
            in the details — then make the call only a detective can.
          </p>

          <ul className="mt-8 hidden gap-5 sm:grid sm:grid-cols-3">
            {features.map((f) => (
              <li key={f.title} className="border-l border-amber-300/40 pl-3">
                <h2 className="text-sm font-semibold text-amber-100">{f.title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-stone-400">{f.body}</p>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="rounded-md bg-amber-400 px-6 py-3 text-sm font-semibold text-stone-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300"
            >
              Start investigating
            </Link>
            <Link
              href="/signin"
              className="rounded-md border border-white/20 bg-black/30 px-6 py-3 text-sm font-semibold text-stone-100 backdrop-blur-sm transition hover:border-amber-300/60 hover:text-amber-100"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-6 py-5 text-xs text-stone-500 sm:px-12">
        Every clue matters.
      </footer>
    </main>
  );
}
