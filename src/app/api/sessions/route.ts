import { NextResponse } from "next/server";
import { createSession, getSessionCountToday, getStudentById } from "@/lib/db";

export const runtime = "nodejs";

type CreateSessionRequest = {
  studentId?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as CreateSessionRequest;

  if (!body.studentId) {
    return NextResponse.json({ error: "studentId is required." }, { status: 400 });
  }

  if (!getStudentById(body.studentId)) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }

  if (getSessionCountToday(body.studentId) >= 20) {
    return NextResponse.json(
      { error: "Daily session limit reached for this student." },
      { status: 429 },
    );
  }

  return NextResponse.json(createSession(body.studentId), { status: 201 });
}
