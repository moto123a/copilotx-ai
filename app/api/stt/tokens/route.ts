import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// 1. SAFE INITIALIZATION
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyInput = process.env.FIREBASE_PRIVATE_KEY;

if (!admin.apps.length) {
  if (!projectId || !clientEmail || !privateKeyInput) {
    console.error("❌ FIREBASE ADMIN ERROR: Missing credentials in .env.local");
  } else {
    try {
      let formattedKey = privateKeyInput;
      if (!formattedKey.startsWith('---')) {
        formattedKey = Buffer.from(formattedKey, 'base64').toString('utf8');
      }
      formattedKey = formattedKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '');

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: formattedKey,
        }),
      });
      console.log("✅ Firebase Admin Initialized Successfully");
    } catch (error) {
      console.error("❌ Firebase Admin Initialization Failed:", error);
    }
  }
}

const db = admin.apps.length ? admin.firestore() : null;
export const dynamic = 'force-dynamic';

// --- UPDATED HELPER: Added transcript and duration to logs ---
async function logUsageAndIncrement(email: string, service: string, details: any) {
  if (!db) return;

  try {
    // 1. Record the detailed log (Now includes transcript and duration)
    await db.collection('api_usage_logs').add({
      userEmail: email || "Anonymous",
      service: service,
      transcript: details.transcript || "", // Saves the actual spoken words
      durationSeconds: details.duration || 0, // Saves usage time
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      transcriptLength: details.transcript?.length || 0
    });

    // 2. Increment usageCount for the user
    if (email) {
      const userQuery = await db.collection('users').where('email', '==', email).limit(1).get();
      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        await userDoc.ref.update({
          usageCount: admin.firestore.FieldValue.increment(1),
          totalDurationSeconds: admin.firestore.FieldValue.increment(details.duration || 0),
          lastUsed: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
  } catch (err) {
    console.error("Usage Tracking Failed:", err);
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get('email') || "Unknown User";
    const apiKey = process.env.SPEECHMATICS_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Key missing' }, { status: 500 });

    const response = await fetch('https://mp.speechmatics.com/v1/api_keys?type=rt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ ttl: 60 }),
    });

    if (!response.ok) return NextResponse.json({ error: 'Failed' }, { status: 401 });
    const data = await response.json();

    // Track STT usage (Duration 0 because it's just a token request)
    await logUsageAndIncrement(userEmail, "Speechmatics", { action: "Token Requested" });

    return NextResponse.json({ token: data.key_value });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Extract transcript, duration, and email
    const { transcript, resume, userEmail, duration } = await req.json(); 
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) return NextResponse.json({ error: 'Key missing' }, { status: 500 });

    // Track Groq usage with full transcript and duration
    await logUsageAndIncrement(userEmail, "Groq", { transcript, duration });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", 
        messages: [
          { role: "system", content: `You are an expert coach. RESUME: ${resume}` },
          { role: "user", content: `TRANSCRIPT: ${transcript}` }
        ],
        temperature: 0.6,
        max_tokens: 200,
      })
    });

    const data = await response.json();
    return NextResponse.json({ answer: data.choices?.[0]?.message?.content || "Thinking..." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}