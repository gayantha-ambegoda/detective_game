import "server-only";
import { BlobNotFoundError, del, head } from "@vercel/blob";
import { GridFSBucket, type ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { MEDIA_FOLDERS, type MediaKind } from "@/lib/definitions";

// Story images and videos live in a public Vercel Blob store. The editor uploads them from
// the browser straight to Blob (see /api/media), so large videos never pass through our functions.

// Confirms each URL is a blob in our store, in the folder for its kind, with a matching content
// type, so a story can't point at something that was never uploaded (or at a video where an
// image belongs, or at some other site).
export async function mediaExists(urls: string[], kind: MediaKind) {
  const unique = [...new Set(urls)];
  const found = await Promise.all(
    unique.map(async (url) => {
      try {
        const blob = await head(url);
        // head() resolves by pathname, so also check the URL is exactly the one in our store.
        return (
          blob.url === url &&
          blob.pathname.startsWith(`${MEDIA_FOLDERS[kind]}/`) &&
          blob.contentType.startsWith(`${kind}/`)
        );
      } catch (error) {
        if (error instanceof BlobNotFoundError) return false;
        throw error;
      }
    }),
  );
  return found.every(Boolean);
}

// Removes blobs a story stopped using. Best effort: a leftover file only costs storage.
export async function deleteMedia(urls: string[]) {
  if (!urls.length) return;
  await del(urls).catch((error) => console.error("media cleanup failed", error));
}

// Removes files left in GridFS by stories saved before media moved to Vercel Blob.
export async function deleteLegacyMedia(ids: ObjectId[]) {
  if (!ids.length) return;
  const bucket = new GridFSBucket(await getDb(), { bucketName: "media" });
  await Promise.all(
    ids.map((id) => bucket.delete(id).catch((error) => console.error("legacy media cleanup failed", error))),
  );
}
