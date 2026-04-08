import { NextRequest, NextResponse } from "next/server";
import { generateLessonPlan } from "@/lib/classroom-v3/lesson-generator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, gradeLevel } = body;

    if (!topic || typeof topic !== "string") {
      return NextResponse.json(
        { error: "topic is required and must be a string" },
        { status: 400 }
      );
    }

    if (!gradeLevel || typeof gradeLevel !== "number") {
      return NextResponse.json(
        { error: "gradeLevel is required and must be a number" },
        { status: 400 }
      );
    }

    const lessonPlan = await generateLessonPlan({ topic, gradeLevel });

    return NextResponse.json(lessonPlan);
  } catch (error) {
    console.error("Lesson generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate lesson plan" },
      { status: 500 }
    );
  }
}
