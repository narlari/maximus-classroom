import { NextResponse } from "next/server";
import { createSession } from "@/lib/classroom-v3/session-store";

export async function POST(req: Request) {
  const { topic, gradeLevel } = await req.json();
  const sessionId = createSession(topic, gradeLevel);
  return NextResponse.json({ sessionId });
}
