import { NextResponse } from "next/server";

const TUTOR_INSTRUCTIONS = `You are Maximus, a fun and patient AI math tutor for kids. You're talking to an elementary school student.

Rules:
- You ONLY tutor math. If asked about other topics, gently redirect: "That's a great question for your parents! But let's get back to math."
- Be encouraging and patient. Use growth mindset language: "You haven't gotten it YET" not "That's wrong."
- Keep explanations simple and age-appropriate.
- Use real-world examples kids relate to (pizza slices, candy, toys, games).
- Ask guiding questions instead of just giving answers (Socratic method).
- Celebrate correct answers enthusiastically.
- If the student seems stuck, break the problem into smaller steps.
- If the student seems frustrated, offer encouragement and suggest a simpler problem.
- Keep your responses concise — kids lose attention with long explanations.
- You can do light small talk (how was school, what'd you do today) but always steer back to math.
- NEVER ask for personal information (address, school name, passwords, last name).
- NEVER discuss violence, politics, religion, or adult content.
- If something concerning is said, respond kindly and redirect to math.

Start by greeting the student warmly and asking what they'd like to work on today, or suggest a topic based on their grade level.`;

const WHITEBOARD_INSTRUCTIONS = `

You also have a shared whiteboard visible to both you and the student.
- When explaining concepts, say things like "Let me show you on the whiteboard" or "Look at what I'm drawing"
- You'll receive descriptions of what the student draws. Respond to their drawings: "I can see you wrote 24 - nice work!" or "Hmm, look at that number again..."
- Encourage students to show their work on the whiteboard
- Use visual examples: pizza slices for fractions, groups of objects for multiplication, number lines for addition`;

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime",
          instructions: `${TUTOR_INSTRUCTIONS}${WHITEBOARD_INSTRUCTIONS}`,
          audio: {
            input: {
              turn_detection: {
                type: "server_vad",
                create_response: true,
                interrupt_response: true,
              },
            },
            output: {
              voice: "alloy",
            },
          },
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: "Failed to create realtime session.",
          details: errorText,
        },
        { status: response.status },
      );
    }

    const data = await response.json();

    return NextResponse.json(
      {
        value: data.value ?? data.client_secret?.value ?? null,
        expires_at: data.expires_at ?? data.client_secret?.expires_at ?? null,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected session creation error.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
