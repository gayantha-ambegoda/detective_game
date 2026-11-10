import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { MEDIA_FOLDERS, MEDIA_LIMITS, type MediaKind } from "@/lib/definitions";
import { getAdminId } from "@/lib/dal";

// Hands the editor a short-lived token so the browser can upload one story image or video
// straight to Vercel Blob. The editor sends the media kind as the client payload.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return Response.json({ error: "Bad request." }, { status: 400 });

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!(await getAdminId())) throw new Error("Only admins can upload.");
        const kind = clientPayload as MediaKind;
        if (!Object.hasOwn(MEDIA_FOLDERS, kind ?? "") ||!pathname.startsWith(`${MEDIA_FOLDERS[kind]}/`)) {
          throw new Error("Only images and videos can be uploaded.");
        }
        return {
          allowedContentTypes: [`${kind}/*`],
          maximumSizeInBytes: MEDIA_LIMITS[kind],
          // Keeps names unique and the public URLs unguessable.
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}
