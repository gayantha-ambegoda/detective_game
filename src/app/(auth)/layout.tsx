import Image from "next/image";
import background from "../../../public/images/background_1.png";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative isolate flex flex-1 items-center justify-center overflow-hidden bg-black px-4 py-8 text-stone-100 sm:py-16">
      <Image
        src={background}
        alt=""
        fill
        preload
        placeholder="blur"
        sizes="100vw"
        className="-z-10 object-cover"
      />
      {/* Vignette keeps the edges' detail from competing with the form */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.15)_0%,rgba(0,0,0,0.65)_100%)]"
      />
      {children}
    </main>
  );
}
