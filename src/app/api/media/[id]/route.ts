import { prisma } from "@/lib/prisma";

/**
 * Serves researcher-uploaded images (streamer photos shown on the public
 * homepage). Assets are immutable — a new upload gets a new id — so they
 * can be cached for a long time.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/media/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const asset = await prisma.mediaAsset.findUnique({ where: { id }, select: { mimeType: true, bytes: true } });
  if (!asset) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(asset.bytes), {
    headers: {
      "Content-Type": asset.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
