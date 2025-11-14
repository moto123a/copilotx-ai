// app/api/generate-questions/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resume, technology, experienceLevel, jobDescription } = body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are an expert technical interviewer. Generate 5 relevant interview questions in JSON format.

Resume/Background: ${resume}
Technology: ${technology}
Experience Level: ${experienceLevel}
Job Description: ${jobDescription || 'General technical role'}

Return ONLY a JSON array: [{"question": "text", "topic": "name"}]`
        }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Anthropic API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate questions' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}