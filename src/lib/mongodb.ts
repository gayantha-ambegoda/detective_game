import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Missing MONGODB_URI environment variable");
}

// Reuse the client across hot reloads in development so connections don't pile up.
const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

const clientPromise =
  globalForMongo._mongoClientPromise ?? new MongoClient(uri).connect();

if (process.env.NODE_ENV !== "production") {
  globalForMongo._mongoClientPromise = clientPromise;
}

export default clientPromise;

export async function getDb() {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB);
}
