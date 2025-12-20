// app/api/stt/tokens/route.ts
import { NextResponse } from "next/server";

function json(data: any, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET() {
  try {
    const apiKey = process.env.SPEECHMATICS_API_KEY;

    if (!apiKey) {
      return json({ ok: false, error: "Missing SPEECHMATICS_API_KEY in .env.local" }, 500);
    }

    // IMPORTANT: long TTL so websocket does not drop quickly
    const ttlSeconds = 3600;

    const r = await fetch("https://mp.speechmatics.com/v1/api_keys?type=rt", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl: ttlSeconds }),
    });

    const rawText = await r.text();
    let j: any = null;
    try {
      j = JSON.parse(rawText);
    } catch {
      // keep rawText
    }

    if (!r.ok) {
      return json(
        {
          ok: false,
          error: "Speechmatics token request failed",
          status: r.status,
          raw: rawText,
        },
        500
      );
    }

    const jwt = j?.key_value;
    if (!jwt) {
      return json({ ok: false, error: "No key_value returned", raw: j ?? rawText }, 500);
    }

    // Return both token and jwt for safety
    return json({ ok: true, jwt, token: jwt, ttl: ttlSeconds });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}