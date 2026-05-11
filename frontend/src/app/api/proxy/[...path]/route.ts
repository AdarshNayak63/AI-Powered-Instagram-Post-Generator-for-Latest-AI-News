import { NextRequest, NextResponse } from "next/server";

const getBackendBaseUrls = () => {
  const candidates = [
    process.env.BACKEND_URL,
    process.env.NEXT_PUBLIC_API_URL,
    "http://127.0.0.1:5001",
    "http://127.0.0.1:5000",
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace(/\/+$/, ""));

  return [...new Set(candidates)];
};

const forward = async (request: NextRequest, path: string[], method: string) => {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  const init: RequestInit = { method, headers };
  if (method !== "GET" && method !== "HEAD") {
    init.body = await request.text();
  }

  const backendBases = getBackendBaseUrls();
  let lastError: unknown = null;

  for (const backendBase of backendBases) {
    const baseUrl = new URL(backendBase);
    const basePathParts = baseUrl.pathname.split("/").filter(Boolean);
    const incomingPathParts = [...path];

    // Avoid duplicated "/api/api/..." when BACKEND_URL already contains "/api".
    if (
      basePathParts[basePathParts.length - 1] === "api" &&
      incomingPathParts[0] === "api"
    ) {
      incomingPathParts.shift();
    }

    const backendUrl = new URL(
      `${backendBase}/${incomingPathParts.join("/")}`.replace(/([^:]\/)\/+/g, "$1")
    );
    request.nextUrl.searchParams.forEach((value, key) => {
      backendUrl.searchParams.set(key, value);
    });

    try {
      const response = await fetch(backendUrl.toString(), init);
      const text = await response.text();
      return new NextResponse(text, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "application/json",
        },
      });
    } catch (error) {
      lastError = error;
    }
  }

  return NextResponse.json(
    { message: "Backend unreachable", detail: String(lastError) },
    { status: 502 }
  );
};

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path, "GET");
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path, "POST");
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path, "PUT");
}
