import OpenAI from 'openai'
import type { LessonProblem } from './types'

export interface EvaluationResult {
  correct: boolean
  feedback: string
  hint?: string
  confidence: 'high' | 'medium' | 'low'
}

const openai = new OpenAI()

const SYSTEM_PROMPT = `You are an elementary school tutor evaluating a student's whiteboard work. You are kind, encouraging, and specific in your feedback.

You will receive:
1. A screenshot of the student's whiteboard work
2. The problem they were asked to solve
3. The type of answer expected (drawing, number, or expression)

Evaluate whether the student's work is correct. Respond with JSON:
{
  "correct": boolean,
  "feedback": "What you would say to the student — be encouraging even if wrong",
  "hint": "If incorrect, a helpful hint to guide them. Omit if correct.",
  "confidence": "high" | "medium" | "low"
}

Rules:
- Be age-appropriate (elementary school)
- If you can't clearly see the student's work, set confidence to "low"
- Give specific feedback about what they did right or where they went wrong
- Hints should guide thinking, not give the answer`

export async function evaluateStudentWork(
  screenshotDataUrl: string,
  lessonProblem: LessonProblem,
  subject: string,
): Promise<EvaluationResult> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      max_tokens: 500,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: screenshotDataUrl, detail: 'high' },
            },
            {
              type: 'text',
              text: `Subject: ${subject}\nProblem: ${lessonProblem.problemText}\nExpected answer type: ${lessonProblem.expectedAnswerType}\nHints available: ${lessonProblem.hints.join('; ')}`,
            },
          ],
        },
      ],
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response content')
    }

    const parsed = JSON.parse(content) as EvaluationResult
    return {
      correct: Boolean(parsed.correct),
      feedback: parsed.feedback || 'Good effort!',
      hint: parsed.hint || undefined,
      confidence: parsed.confidence || 'medium',
    }
  } catch (err) {
    console.error('Vision evaluation failed:', err)
    return {
      correct: false,
      feedback: "Let me take another look... Can you try showing your work more clearly?",
      confidence: 'low',
    }
  }
}
