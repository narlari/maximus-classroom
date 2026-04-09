'use client'

import { useRef, useState, useCallback } from 'react'
import type { Editor } from 'tldraw'
import type { LessonPlan, ClassroomPhase } from '@/lib/classroom-v3'
import type { EvaluationResult } from '@/lib/classroom-v3/vision-eval'
import { renderProblemToBoard, clearTeacherLayer, clearStudentLayer } from '@/lib/classroom-v3'
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

async function logSessionEvent(sessionId: string | null, type: string, data: object) {
  if (!sessionId) return
  try {
    await fetch('/api/classroom/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, type, data }),
    })
  } catch (err) {
    console.error('Failed to log event:', err)
  }
}

export default function ClassroomV3() {
  const editorRef = useRef<Editor | null>(null)
  const sessionIdRef = useRef<string | null>(null)
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
    setPhase('generating')
    try {
      const res = await fetch('/api/lesson/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'addition and subtraction', gradeLevel: 4 }),
      })
      if (!res.ok) throw new Error('Failed to generate lesson')
      const lessonPlan: LessonPlan = await res.json()

      // Create a session
      const sessionRes = await fetch('/api/classroom/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'addition and subtraction', gradeLevel: 4 }),
      })
      const { sessionId } = await sessionRes.json()
      sessionIdRef.current = sessionId

      setLesson(lessonPlan)
      setCurrentProblemIndex(0)
      setEvaluation(null)

      logSessionEvent(sessionId, 'lesson_started', {
        topic: lessonPlan.topic,
        gradeLevel: lessonPlan.gradeLevel,
        lessonPlan,
      })
      logSessionEvent(sessionId, 'problem_shown', {
        problemIndex: 0,
        problemText: lessonPlan.problems[0].problemText,
      })
      if (editorRef.current) {
        clearTeacherLayer(editorRef.current)
        clearStudentLayer(editorRef.current)
        renderProblemToBoard(editorRef.current, lessonPlan.problems[0])
      }
      speakText(lessonPlan.problems[0].spokenPrompt || `Let's work on ${lessonPlan.problems[0].problemText}`)
      setPhase('teaching')
      setTimeout(() => setPhase('student_turn'), 2000)
    } catch (err) {
      console.error('Failed to start lesson:', err)
      setPhase('idle')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleNextProblem = useCallback(() => {
    if (!lesson || !editorRef.current) return
    const nextIndex = currentProblemIndex + 1
    if (nextIndex >= lesson.problems.length) {
      speakText("Amazing work! You finished the whole lesson! Great job today!")
      logSessionEvent(sessionIdRef.current, 'lesson_complete', {})
      setPhase('complete')
      return
    }
    clearTeacherLayer(editorRef.current)
    clearStudentLayer(editorRef.current)
    setCurrentProblemIndex(nextIndex)
    setEvaluation(null)
    renderProblemToBoard(editorRef.current, lesson.problems[nextIndex])
    logSessionEvent(sessionIdRef.current, 'problem_shown', {
      problemIndex: nextIndex,
      problemText: lesson.problems[nextIndex].problemText,
    })
    const problem = lesson.problems[nextIndex]
    speakText(problem.spokenPrompt || `Great! Now let's try: ${problem.problemText}`)
    setPhase('teaching')
    setTimeout(() => setPhase('student_turn'), 2000)
  }, [lesson, currentProblemIndex])

  const handleCheckWork = useCallback(async () => {
    if (!editorRef.current || !lesson) return
    const currentProblem = lesson.problems[currentProblemIndex]
    setEvaluating(true)
    setEvaluation(null)
    setPhase('evaluating')

    try {
      const screenshot = await captureScreenshot(editorRef.current)
      console.log('[screenshot] prefix:', screenshot.substring(0, 30))
      logSessionEvent(sessionIdRef.current, 'student_submitted', {
        problemIndex: currentProblemIndex,
        screenshot: screenshot || '',
      })
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
      logSessionEvent(sessionIdRef.current, 'evaluation_result', {
        problemIndex: currentProblemIndex,
        correct: result.correct,
        feedback: result.feedback,
      })
      speakText(result.feedback)

      if (result.correct) {
        setPhase('reviewing')
        // Auto-advance after TTS has time to play
        setTimeout(() => handleNextProblem(), 2000)
      } else {
        // Wrong answer: speak hint, clear student layer for retry
        if (result.hint) {
          setTimeout(() => speakText(result.hint!), 1500)
        }
        if (editorRef.current) {
          clearStudentLayer(editorRef.current)
        }
        setPhase('student_turn')
      }
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
  }, [lesson, currentProblemIndex, handleNextProblem])

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
