import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const apiKey = process.env.SPEECHMATICS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key missing' }, { status: 500 });
    }

    const response = await fetch('https://mp.speechmatics.com/v1/api_keys?type=rt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ ttl: 60 }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch token' }, { status: 401 });
    }

    const data = await response.json();
    return NextResponse.json({ token: data.key_value });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}