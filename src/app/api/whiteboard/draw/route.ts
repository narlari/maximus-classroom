import { NextResponse } from "next/server";
import { buildWhiteboardVisual, inferWhiteboardVisual } from "@/lib/whiteboard";

type DrawRequest = {
  transcript?: string;
  visual?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DrawRequest;
    const requestedVisual =
      body.visual === "number-line" ||
      body.visual === "fraction-circles" ||
      body.visual === "grid" ||
      body.visual === "basic-shapes"
        ? body.visual
        : null;
    const inferredVisual = body.transcript ? inferWhiteboardVisual(body.transcript) : null;
    const visualId = requestedVisual ?? inferredVisual;

    if (!visualId) {
      return NextResponse.json({ visual: null }, { status: 200 });
    }

    const scene = buildWhiteboardVisual(visualId);
    return NextResponse.json(scene, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to prepare whiteboard drawing.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
