import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/dal";
import { listReports } from "@/lib/reports";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <>
      <header>
        <p className="font-mono text-xs tracking-widest text-amber-200/70 uppercase">
          Case files · Reports
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-100">Filed reports</h1>
      </header>

      <Suspense fallback={<p className="text-sm text-stone-400">Opening the files…</p>}>
        <ReportList />
      </Suspense>
    </>
  );
}

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

async function ReportList() {
  await requireAdmin();
  // Reports change all the time, so always read them per request.
  await connection();
  const reports = await listReports();

  if (!reports.length) {
    return <p className="text-sm text-stone-400">No reports have been filed yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {reports.map((report) => (
        <li key={report.id} className="rounded-md border border-white/10 bg-black/40 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="font-semibold break-words text-amber-100">{report.title}</h2>
            <time
              dateTime={report.createdAt.toISOString()}
              className="font-mono text-xs text-stone-500"
            >
              {dateFormat.format(report.createdAt)}
            </time>
          </div>
          <p className="mt-1 font-mono text-xs text-stone-400">
            {report.reporter
              ? `${report.reporter.name} · ${report.reporter.email}`
              : "Deleted account"}
          </p>
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap break-words text-stone-300">
            {report.description}
          </p>
        </li>
      ))}
    </ul>
  );
}
