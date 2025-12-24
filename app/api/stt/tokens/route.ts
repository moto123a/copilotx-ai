import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 1. GET: Fetches Speechmatics Token (For Transcribing)
export async function GET() {
  try {
    const apiKey = process.env.SPEECHMATICS_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Speechmatics key missing' }, { status: 500 });

    const response = await fetch('https://mp.speechmatics.com/v1/api_keys?type=rt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ ttl: 60 }),
    });

    if (!response.ok) return NextResponse.json({ error: 'Failed to fetch STT token' }, { status: 401 });

    const data = await response.json();
    return NextResponse.json({ token: data.key_value });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. POST: Generates AI Answer via OpenRouter (For Brain)
export async function POST(req: Request) {
  try {
    const { transcript, resume } = await req.json();
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    if (!openRouterKey) {
      console.error("API Error: OPENROUTER_API_KEY is missing in .env.local");
      return NextResponse.json({ error: 'OpenRouter key missing' }, { status: 500 });
    }

    // Switched to Llama 3.3 70B Free - It is more reliable than Gemini Experimental
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI Interview Assistant",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [
          {
            role: "system",
            content: `You are an expert interview coach. 
            RESUME: ${resume}
            
            TASK: Based on the transcript, provide a concise 2-sentence first-person response for the user to say.
            RULES:
            1. Speak as the candidate ("I", "My experience").
            2. Be professional and conversational.
            3. Do not include introductory text like "You should say:".`
          },
          {
            role: "user",
            content: `TRANSCRIPT: ${transcript}`
          }
        ],
        temperature: 0.5, // Lower temperature = more stable, professional answers
      })
    });

    const data = await response.json();

    // LOGGING: Check your VS Code terminal if it fails
    if (data.error) {
      console.error("OpenRouter API Error:", data.error);
      return NextResponse.json({ answer: `AI Error: ${data.error.message || 'Limit reached'}` });
    }

    const aiAnswer = data.choices?.[0]?.message?.content;

    if (!aiAnswer) {
      console.log("OpenRouter returned empty response. Full Data:", JSON.stringify(data));
      return NextResponse.json({ answer: "AI is currently busy. Please wait 3 seconds and press SPACE again." });
    }

    return NextResponse.json({ answer: aiAnswer });
  } catch (error: any) {
    console.error("Internal Route Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}