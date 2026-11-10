import "server-only";
import { ObjectId, MongoServerError } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type UserRole = "admin" | "user";

type UserDoc = {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  // Missing on accounts created before roles existed; treat those as "user".
  role?: UserRole;
  createdAt: Date;
  // One entry per policy version the user accepted, kept as a consent record.
  privacyConsents?: { version: string; acceptedAt: Date }[];
};

let indexesReady: Promise<string> | undefined;

async function usersCollection() {
  const db = await getDb();
  const users = db.collection<UserDoc>("users");
  indexesReady ??= users.createIndex({ email: 1 }, { unique: true });
  await indexesReady;
  return users;
}

export class EmailTakenError extends Error {}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}) {
  const users = await usersCollection();
  try {
    const { insertedId } = await users.insertOne({
      _id: new ObjectId(),
      ...input,
      createdAt: new Date(),
    });
    return insertedId.toHexString();
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new EmailTakenError();
    }
    throw error;
  }
}

export async function hasAnyUser() {
  const users = await usersCollection();
  return (await users.countDocuments({}, { limit: 1 })) > 0;
}

export async function findUserByEmail(email: string) {
  const users = await usersCollection();
  return users.findOne({ email });
}

export async function findUserById(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const users = await usersCollection();
  return users.findOne(
    { _id: new ObjectId(id) },
    { projection: { name: 1, email: 1, role: 1, privacyConsents: 1 } },
  );
}

export async function recordPrivacyConsent(id: string, version: string) {
  if (!ObjectId.isValid(id)) return;
  const users = await usersCollection();
  // Skip if this version is already recorded so double clicks don't add duplicates.
  await users.updateOne(
    { _id: new ObjectId(id), "privacyConsents.version": { $ne: version } },
    { $push: { privacyConsents: { version, acceptedAt: new Date() } } },
  );
}
