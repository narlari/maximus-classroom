'use client'

import type { LessonPlan, ClassroomPhase } from '@/lib/classroom-v3'
import type { EvaluationResult } from '@/lib/classroom-v3/vision-eval'

interface LessonControlsProps {
  phase: ClassroomPhase
  lesson: LessonPlan | null
  currentProblemIndex: number
  loading: boolean
  evaluating: boolean
  evaluation: EvaluationResult | null
  onStartLesson: () => void
  onNextProblem: () => void
  onCheckWork: () => void
}

export default function LessonControls({
  phase,
  lesson,
  currentProblemIndex,
  loading,
  evaluating,
  evaluation,
  onStartLesson,
  onNextProblem,
  onCheckWork,
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

      {(phase === 'teaching' || phase === 'student_turn' || phase === 'evaluating' || phase === 'reviewing') && currentProblem && (
        <>
          <p className="text-xl text-gray-800 text-center">
            {currentProblem.problemText}
          </p>

          {evaluating && (
            <div className="flex items-center gap-3 text-gray-600">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              <span>Checking your work...</span>
            </div>
          )}

          {evaluation && (
            <div className={`text-center rounded-lg p-3 max-w-md ${evaluation.correct ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
              <p className="font-medium">
                {evaluation.correct ? '\u2705 ' : ''}{evaluation.feedback}
              </p>
              {evaluation.hint && !evaluation.correct && (
                <p className="text-sm mt-1 opacity-80">Hint: {evaluation.hint}</p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            {(phase === 'teaching' || phase === 'student_turn') && !evaluating && (
              <button
                onClick={onCheckWork}
                className="px-5 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Check My Work
              </button>
            )}

            {(phase === 'reviewing' || (phase === 'teaching' && !evaluation)) && !evaluating && (
              <button
                onClick={onNextProblem}
                className={`px-5 py-2 text-white rounded-lg font-medium transition-colors ${
                  isLastProblem
                    ? 'bg-gray-600 hover:bg-gray-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isLastProblem ? 'Finish Lesson' : 'Next Problem'}
              </button>
            )}
          </div>
        </>
      )}

      {phase === 'ended' && (
        <p className="text-xl text-green-700 font-medium">Lesson complete!</p>
      )}
    </div>
  )
}
