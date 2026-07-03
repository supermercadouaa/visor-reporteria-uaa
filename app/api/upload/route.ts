import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

const PDF_PATHNAME = "dashboard.pdf";

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.UPLOAD_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.arrayBuffer();
  if (body.byteLength === 0) {
    return NextResponse.json({ error: "empty body" }, { status: 400 });
  }

  const blob = await put(PDF_PATHNAME, body, {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/pdf",
    cacheControlMaxAge: 0,
    allowOverwrite: true,
  });

  return NextResponse.json({
    ok: true,
    url: blob.url,
    uploadedAt: new Date().toISOString(),
  });
}
