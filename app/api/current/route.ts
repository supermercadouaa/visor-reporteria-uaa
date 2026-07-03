import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { blobs } = await list({ prefix: "dashboard.pdf", limit: 1 });
  const blob = blobs[0];

  if (!blob) {
    return NextResponse.json({ error: "no pdf uploaded yet" }, { status: 404 });
  }

  return NextResponse.json({
    url: blob.url,
    uploadedAt: blob.uploadedAt,
  });
}
