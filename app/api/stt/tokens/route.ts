import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 1. GET: Fetches Speechmatics Token (Keep exactly as is)
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

// 2. POST: Generates AI Answer via Groq (Updated for Speed)
export async function POST(req: Request) {
  try {
    const { transcript, resume } = await req.json();
    
    // CHANGED: Using Groq API Key
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      console.error("API Error: GROQ_API_KEY is missing in .env.local");
      return NextResponse.json({ error: 'Groq key missing' }, { status: 500 });
    }

    // CHANGED: Fetching from Groq API directly
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        // CHANGED: The Fastest Model
        model: "llama-3.1-8b-instant", 
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
        temperature: 0.6, // Slightly higher for more natural speech
        max_tokens: 200, // Limit tokens for speed
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("Groq API Error:", data.error);
      return NextResponse.json({ answer: `AI Error: ${data.error.message || 'Groq Error'}` });
    }

    const aiAnswer = data.choices?.[0]?.message?.content;

    if (!aiAnswer) {
      return NextResponse.json({ answer: "AI is thinking..." });
    }

    return NextResponse.json({ answer: aiAnswer });
  } catch (error: any) {
    console.error("Internal Route Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}