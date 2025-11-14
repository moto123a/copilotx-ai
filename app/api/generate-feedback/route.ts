// app/api/generate-feedback/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questions, answers } = body;

    const qaText = questions.map((q: any, i: number) => 
      `Q${i + 1}: ${q.question}\nA${i + 1}: ${answers[i]?.text || 'No answer'}`
    ).join('\n\n');

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
          content: `Analyze this mock interview and provide feedback. Return ONLY valid JSON.

Questions and Answers:
${qaText}

Return: {"overallScore": <1-10>, "strengths": ["point1", "point2", "point3"], "improvements": ["point1", "point2", "point3"], "summary": "brief summary"}`
        }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Anthropic API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate feedback' },
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
