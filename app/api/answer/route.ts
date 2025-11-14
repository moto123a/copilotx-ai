// app/api/answer/route.ts

import { NextResponse } from 'next/server';

// IMPORTANT: Ensure OPENROUTER_API_KEY is set in your Next.js .env file
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(request: Request) {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'Server configuration error: OPENROUTER_API_KEY missing' }, { status: 500 });
  }

  try {
    const { question, resume } = await request.json();

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 });
    }

    // Truncate resume as done in the original server.js
    const resumeShort = (resume || '').toString().split(/\s+/).slice(0, 400).join(' ');

    const messages = [
      {
        role: 'system',
        content: `
You are "Interview Assistant".

Follow these product rules exactly:
1) Live Microphone (Always On): UI streams every word in real time.
2) Spacebar Logic: When Space is pressed once, the LAST SPOKEN QUESTION is sent to you; return a concise, confident answer. Space again resumes mic.
3) Resume Handling: Resume text is pasted in UI and kept only in memory; use it when helpful.
4) Instant UI Updates: Provide a quick, professional answer.

Write as the candidate (first person). Prefer 4–8 sentences; if bullets fit better, use 3–5 short bullets. Use resume context only when relevant. Avoid fluff and apologies.` // System Prompt from server.js
      },
      {
        role: 'user',
        content: `Last spoken interview question:\n${question}\n\nCandidate resume (context only):\n${resumeShort}`
      }
    ];

    const openRouterResponse = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'X-Title': 'Interview Assistant - WebKit' // Header from server.js
        },
        body: JSON.stringify({ 
            model: 'anthropic/claude-3-haiku', 
            messages, 
            temperature: 0.3, 
            max_tokens: 300 
        }),
      }
    );
    
    if (!openRouterResponse.ok) {
        const errorData = await openRouterResponse.json();
        throw new Error(JSON.stringify(errorData));
    }

    const data = await openRouterResponse.json();
    const answer = data?.choices?.[0]?.message?.content?.toString?.() ?? '(no answer)';
    
    return NextResponse.json({ ok: true, answer });

  } catch (err) {
    console.error('Answer error:', err);
    return NextResponse.json({ error: 'Failed to generate answer.' }, { status: 500 });
  }
}