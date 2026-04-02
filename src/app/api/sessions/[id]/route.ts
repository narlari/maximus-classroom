import { NextResponse } from "next/server";
import { getSessionById, updateSessionDetails } from "@/lib/db";
import { finalizeSession } from "@/lib/tutor";

export const runtime = "nodejs";

type UpdateSessionRequest = {
  endedAt?: string;
  durationMinutes?: number;
  summary?: string;
  topicsCovered?: string[];
  performanceNotes?: string;
  apiCostCents?: number;
  generateSummary?: boolean;
};

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const existing = getSessionById(params.id);

  if (!existing) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as UpdateSessionRequest;

  if (body.generateSummary) {
    const session = await finalizeSession(params.id);
    return NextResponse.json(session, { status: 200 });
  }

  const updated = updateSessionDetails({
    sessionId: params.id,
    endedAt: body.endedAt ?? null,
    durationMinutes: body.durationMinutes ?? null,
    summary: body.summary ?? null,
    topicsCovered: body.topicsCovered ?? null,
    performanceNotes: body.performanceNotes ?? null,
    apiCostCents: body.apiCostCents ?? null,
  });

  return NextResponse.json(updated, { status: 200 });
}
