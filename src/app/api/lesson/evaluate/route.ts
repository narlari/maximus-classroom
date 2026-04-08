import { NextRequest, NextResponse } from 'next/server'
import { evaluateStudentWork } from '@/lib/classroom-v3/vision-eval'
import type { LessonProblem } from '@/lib/classroom-v3/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { screenshotDataUrl, step, subject } = body as {
      screenshotDataUrl: string
      step: LessonProblem
      subject: string
    }

    if (!screenshotDataUrl || typeof screenshotDataUrl !== 'string') {
      return NextResponse.json(
        { error: 'screenshotDataUrl is required' },
        { status: 400 },
      )
    }

    if (!step || !step.problemText) {
      return NextResponse.json(
        { error: 'step is required with problemText' },
        { status: 400 },
      )
    }

    const result = await evaluateStudentWork(
      screenshotDataUrl,
      step,
      subject || 'elementary math',
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Evaluation endpoint failed:', error)
    return NextResponse.json(
      { error: 'Failed to evaluate student work' },
      { status: 500 },
    )
  }
}
