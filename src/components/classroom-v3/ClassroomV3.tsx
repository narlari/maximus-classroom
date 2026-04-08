'use client'

import { useRef, useState, useCallback } from 'react'
import type { Editor } from 'tldraw'
import type { LessonPlan, ClassroomPhase } from '@/lib/classroom-v3'
import type { EvaluationResult } from '@/lib/classroom-v3/vision-eval'
import { renderProblemToBoard, clearTeacherLayer } from '@/lib/classroom-v3'
import { speakText } from '@/lib/classroom-v3/tts'
import ClassroomWhiteboard from './ClassroomWhiteboard'
import LessonControls from './LessonControls'

async function captureScreenshot(editor: Editor): Promise<string> {
  const shapeIds = [...editor.getCurrentPageShapeIds()]
  if (shapeIds.length === 0) {
    throw new Error('No shapes on canvas')
  }
  const result = await editor.toImageDataUrl(shapeIds, { format: 'png', background: true })
  return result.url
}

export default function ClassroomV3() {
  const editorRef = useRef<Editor | null>(null)
  const [lesson, setLesson] = useState<LessonPlan | null>(null)
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0)
  const [phase, setPhase] = useState<ClassroomPhase>('idle')
  const [loading, setLoading] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null)

  const handleEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor
  }, [])

  const handleStartLesson = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/lesson/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'addition and subtraction', gradeLevel: 4 }),
      })
      if (!res.ok) throw new Error('Failed to generate lesson')
      const lessonPlan: LessonPlan = await res.json()
      setLesson(lessonPlan)
      setCurrentProblemIndex(0)
      setEvaluation(null)
      if (editorRef.current) {
        renderProblemToBoard(editorRef.current, lessonPlan.problems[0])
      }
      speakText(`Let's work on ${lessonPlan.problems[0].problemText}`)
      setPhase('teaching')
    } catch (err) {
      console.error('Failed to start lesson:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleNextProblem = useCallback(() => {
    if (!lesson || !editorRef.current) return
    const nextIndex = currentProblemIndex + 1
    if (nextIndex >= lesson.problems.length) {
      speakText("Amazing work! Lesson complete!")
      setPhase('ended')
      return
    }
    clearTeacherLayer(editorRef.current)
    setCurrentProblemIndex(nextIndex)
    setEvaluation(null)
    renderProblemToBoard(editorRef.current, lesson.problems[nextIndex])
    speakText(`Great! Now let's try: ${lesson.problems[nextIndex].problemText}`)
  }, [lesson, currentProblemIndex])

  const handleCheckWork = useCallback(async () => {
    if (!editorRef.current || !lesson) return
    const currentProblem = lesson.problems[currentProblemIndex]
    setEvaluating(true)
    setEvaluation(null)
    setPhase('evaluating')

    try {
      const screenshot = await captureScreenshot(editorRef.current)
      const res = await fetch('/api/lesson/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screenshotDataUrl: screenshot,
          step: currentProblem,
          subject: `grade ${lesson.gradeLevel} ${lesson.topic}`,
        }),
      })
      if (!res.ok) throw new Error('Evaluation request failed')
      const result: EvaluationResult = await res.json()
      setEvaluation(result)
      speakText(result.feedback)
      setPhase(result.correct ? 'reviewing' : 'student_turn')
    } catch (err) {
      console.error('Check work failed:', err)
      setEvaluation({
        correct: false,
        feedback: "Let me take another look... Try showing your work more clearly!",
        confidence: 'low',
      })
      setPhase('student_turn')
    } finally {
      setEvaluating(false)
    }
  }, [lesson, currentProblemIndex])

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-[7] min-h-0">
        <ClassroomWhiteboard onEditorReady={handleEditorReady} />
      </div>
      <div className="flex-[3] border-t border-gray-200 bg-white">
        <LessonControls
          phase={phase}
          lesson={lesson}
          currentProblemIndex={currentProblemIndex}
          loading={loading}
          evaluating={evaluating}
          evaluation={evaluation}
          onStartLesson={handleStartLesson}
          onNextProblem={handleNextProblem}
          onCheckWork={handleCheckWork}
        />
      </div>
    </div>
  )
}
