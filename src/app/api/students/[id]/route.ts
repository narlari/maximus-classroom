import { NextResponse } from "next/server";
import { getStudentProfile } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const profile = getStudentProfile(params.id);

  if (!profile) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }

  return NextResponse.json(profile, { status: 200 });
}
