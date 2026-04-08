'use client'

import { useRef, useState, useCallback } from 'react'
import type { Editor } from 'tldraw'
import type { LessonPlan, ClassroomPhase } from '@/lib/classroom-v3'
import { renderProblemToBoard, clearTeacherLayer } from '@/lib/classroom-v3'
import ClassroomWhiteboard from './ClassroomWhiteboard'
import LessonControls from './LessonControls'

export default function ClassroomV3() {
  const editorRef = useRef<Editor | null>(null)
  const [lesson, setLesson] = useState<LessonPlan | null>(null)
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0)
  const [phase, setPhase] = useState<ClassroomPhase>('idle')
  const [loading, setLoading] = useState(false)

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
      if (editorRef.current) {
        renderProblemToBoard(editorRef.current, lessonPlan.problems[0])
      }
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
      setPhase('ended')
      return
    }
    clearTeacherLayer(editorRef.current)
    setCurrentProblemIndex(nextIndex)
    renderProblemToBoard(editorRef.current, lesson.problems[nextIndex])
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
          onStartLesson={handleStartLesson}
          onNextProblem={handleNextProblem}
        />
      </div>
    </div>
  )
}
