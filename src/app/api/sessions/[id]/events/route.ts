import { NextResponse } from "next/server";
import { getSessionById, getSessionEvents, logSessionEvent } from "@/lib/db";

export const runtime = "nodejs";

type LogEventRequest = {
  eventType?: string;
  content?: string;
  metadata?: Record<string, unknown>;
};

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!getSessionById(params.id)) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as LogEventRequest;

  if (!body.eventType) {
    return NextResponse.json({ error: "eventType is required." }, { status: 400 });
  }

  return NextResponse.json(
    logSessionEvent({
      sessionId: params.id,
      eventType: body.eventType,
      content: body.content ?? null,
      metadata: body.metadata ?? null,
    }),
    { status: 201 },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  if (!getSessionById(params.id)) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json(getSessionEvents(params.id));
}
