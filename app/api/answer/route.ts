import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    return NextResponse.json({
      ok: true,
      message: "API /answer route is working",
      received: body
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { ok: false, error: "Server crashed inside /api/answer" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, status: "GET working for /api/answer" });
}