import { NextResponse } from "next/server";
import { logEvent } from "@/lib/classroom-v3/session-store";

export async function POST(req: Request) {
  const { sessionId, type, data } = await req.json();
  logEvent(sessionId, type, data);
  return NextResponse.json({ ok: true });
}
