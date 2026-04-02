import { NextResponse } from "next/server";
import { getStudentById, getStudentProgress } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const student = getStudentById(params.id);

  if (!student) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      student,
      progress: getStudentProgress(params.id),
    },
    { status: 200 },
  );
}
