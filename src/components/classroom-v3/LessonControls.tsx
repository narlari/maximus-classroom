'use client'

import type { LessonPlan, ClassroomPhase } from '@/lib/classroom-v3'

interface LessonControlsProps {
  phase: ClassroomPhase
  lesson: LessonPlan | null
  currentProblemIndex: number
  loading: boolean
  onStartLesson: () => void
  onNextProblem: () => void
}

export default function LessonControls({
  phase,
  lesson,
  currentProblemIndex,
  loading,
  onStartLesson,
  onNextProblem,
}: LessonControlsProps) {
  const currentProblem = lesson?.problems[currentProblemIndex]
  const isLastProblem = lesson ? currentProblemIndex >= lesson.problems.length - 1 : false

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 gap-4">
      {phase === 'idle' && !loading && (
        <button
          onClick={onStartLesson}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Start Lesson
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-gray-600">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-lg">Generating lesson...</span>
        </div>
      )}

      {(phase === 'teaching' || phase === 'student_turn') && currentProblem && (
        <>
          <p className="text-xl text-gray-800 text-center">
            {currentProblem.problemText}
          </p>
          {phase === 'teaching' && !isLastProblem && (
            <button
              onClick={onNextProblem}
              className="px-5 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Next Problem
            </button>
          )}
          {phase === 'teaching' && isLastProblem && (
            <button
              onClick={onNextProblem}
              className="px-5 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              Finish Lesson
            </button>
          )}
        </>
      )}

      {phase === 'ended' && (
        <p className="text-xl text-green-700 font-medium">Lesson complete!</p>
      )}
    </div>
  )
}
