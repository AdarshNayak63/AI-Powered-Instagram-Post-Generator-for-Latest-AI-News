import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const headers = new Headers();
    headers.set("Content-Type", res.headers.get("Content-Type") || "image/jpeg");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Cache-Control", "public, max-age=86400");
    
    return new NextResponse(blob, {
      status: res.status,
      headers
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return new NextResponse("Failed to fetch image", { status: 500 });
  }
}
