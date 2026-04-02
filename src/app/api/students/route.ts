import { NextResponse } from "next/server";
import { listStudents } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ students: listStudents() }, { status: 200 });
}
