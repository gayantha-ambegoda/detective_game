import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { signout } from "@/app/actions/auth";
import { PrivacyPolicyDialog } from "@/app/ui/privacy-policy-dialog";
import { ReportButton } from "@/app/ui/report-button";
import { getCurrentUser } from "@/lib/dal";
import background from "../../../public/images/background_1.png";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <main className="relative isolate flex-1 overflow-hidden bg-black">
      <Image
        src={background}
        alt=""
        fill
        preload
        placeholder="blur"
        sizes="100vw"
        className="-z-10 object-cover"
      />

      {/* Reads the session cookie, so it streams in behind the boundary. */}
      <Suspense fallback={null}>
        <PrivacyGate />
      </Suspense>

      <nav className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4">
        <Link href="/dashboard/investigate" className={`${primaryButton} block text-center`}>
          Investigate now
        </Link>
        <Link href="/dashboard/investigated" className={`${secondaryButton} block text-center`}>
          Investigated cases
        </Link>
        <Suspense fallback={null}>
          <AdminOptions />
        </Suspense>
      </nav>

      <div className="absolute right-4 bottom-4 flex items-center gap-3 sm:right-6 sm:bottom-6">
        <form action={signout}>
          <button
            type="submit"
            className="group flex -rotate-2 items-center gap-2 rounded-sm border border-amber-900/40 bg-amber-100/90 px-4 py-2 font-mono text-sm font-semibold tracking-widest text-stone-900 uppercase shadow-lg shadow-black/70 transition hover:rotate-0 hover:bg-amber-50 focus-visible:rotate-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            Sign out
          </button>
        </form>
        <ReportButton />
      </div>
    </main>
  );
}

const caseButton =
  "w-64 rounded-md px-6 py-3 font-mono text-sm font-semibold tracking-widest uppercase shadow-lg shadow-black/70 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200";
const primaryButton = `${caseButton} bg-amber-200 text-stone-950 hover:bg-amber-100`;
const secondaryButton = `${caseButton} border border-amber-200/40 bg-stone-950/60 text-amber-100 backdrop-blur-sm hover:border-amber-200/70 hover:bg-stone-900/70`;

// The proxy only checks the cookie; this re-verifies the user against the DB (redirecting if
// invalid) and asks for the privacy policy until the current version is accepted.
async function PrivacyGate() {
  const user = await getCurrentUser();
  return user.acceptedPrivacyPolicy ? null : <PrivacyPolicyDialog />;
}

async function AdminOptions() {
  const user = await getCurrentUser();
  if (user.role !== "admin") return null;
  return (
    <>
      <Link href="/dashboard/reports" className={`${secondaryButton} block text-center`}>
        View reports
      </Link>
      <Link href="/dashboard/cases" className={`${secondaryButton} block text-center`}>
        Cases
      </Link>
    </>
  );
}
