// app/api/process-answer/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, answer, isLastQuestion, nextQuestion } = body;

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
          content: `You are conducting a mock interview. The candidate just answered a question.

Question: ${question}
Candidate's Answer: ${answer}

Respond naturally as an interviewer would:
1. Give brief feedback on their answer (1-2 sentences)
2. ${!isLastQuestion 
  ? `Then ask the next question: ${nextQuestion}` 
  : 'Then thank them and say the interview is complete.'}

Keep your response conversational and encouraging.`
        }]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Anthropic API error:', error);
      return NextResponse.json(
        { error: 'Failed to process answer' },
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