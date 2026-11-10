import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

type ReportDoc = {
  _id: ObjectId;
  userId: ObjectId;
  title: string;
  description: string;
  createdAt: Date;
};

export async function createReport(input: { userId: string; title: string; description: string }) {
  const db = await getDb();
  const reports = db.collection<ReportDoc>("reports");
  await reports.insertOne({
    _id: new ObjectId(),
    userId: new ObjectId(input.userId),
    title: input.title,
    description: input.description,
    createdAt: new Date(),
  });
}

export type ReportListItem = {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  reporter: { name: string; email: string } | null;
};

// Newest first, with each reporter's name and email joined in. Callers must check for admin.
export async function listReports(limit = 100): Promise<ReportListItem[]> {
  const db = await getDb();
  const rows = await db
    .collection<ReportDoc>("reports")
    .aggregate<ReportDoc & { reporter: { name: string; email: string }[] }>([
      { $sort: { createdAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "reporter",
          pipeline: [{ $project: { _id: 0, name: 1, email: 1 } }],
        },
      },
    ])
    .toArray();

  return rows.map((r) => ({
    id: r._id.toHexString(),
    title: r.title,
    description: r.description,
    createdAt: r.createdAt,
    reporter: r.reporter[0] ?? null,
  }));
}
