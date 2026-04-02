import { NextResponse } from "next/server";

type AnalyzeRequest = {
  imageDataUrl?: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
  }

  try {
    const body = (await request.json()) as AnalyzeRequest;

    if (!body.imageDataUrl) {
      return NextResponse.json({ error: "Missing imageDataUrl." }, { status: 400 });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "You describe a child's math whiteboard for a tutor. Reply with exactly one short sentence that begins with 'Student wrote:' or 'Student drew:'. Mention only clear, visible math work.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Describe the student's visible math work in one short sentence for the tutor.",
              },
              {
                type: "image_url",
                image_url: {
                  url: body.imageDataUrl,
                },
              },
            ],
          },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: "Failed to analyze whiteboard snapshot.",
          details: errorText,
        },
        { status: response.status },
      );
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const description = data.choices?.[0]?.message?.content?.trim();

    return NextResponse.json({ description: description ?? null }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected whiteboard analysis error.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
