import "server-only";
import { prisma } from "@/lib/prisma";
import { StudyRuleError } from "./sessions";

export const MAX_IMAGE_BYTES = 600 * 1024;

/** Detects the real image type from magic bytes — the client-declared type is not trusted. */
export function sniffImageType(buf: Buffer): "image/png" | "image/jpeg" | "image/webp" | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Stores a validated image and returns the public path that serves it. */
export async function storeImage(file: Blob, purpose: string, actorId: string): Promise<string> {
  if (file.size === 0) throw new StudyRuleError("The file is empty.");
  if (file.size > MAX_IMAGE_BYTES) throw new StudyRuleError("Image is too large (max 600 KB after resizing).");
  const buf = Buffer.from(await file.arrayBuffer());
  const mimeType = sniffImageType(buf);
  if (!mimeType) throw new StudyRuleError("Upload a PNG, JPEG or WebP image.");
  const asset = await prisma.mediaAsset.create({
    data: { mimeType, bytes: buf, sizeBytes: buf.length, purpose: purpose.slice(0, 40), createdById: actorId },
  });
  return `/api/media/${asset.id}`;
}
