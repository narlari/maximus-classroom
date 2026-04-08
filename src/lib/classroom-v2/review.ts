import type {
  ClassroomState,
  StudentBoardEvidence,
  StudentBoardSnapshot,
  StudentBoardStroke,
  StudentCombinedEvidence,
  StudentVoiceEvidence,
  StudentVoiceTranscriptSegment,
  TutorAction,
  TutorReviewContext,
  TutorTurnPlan,
} from "@/lib/classroom-v2/types";

export type CreateBoardSubmissionEvidenceInput = {
  lessonId: string;
  state: ClassroomState;
  activeTurn: TutorTurnPlan;
  submissionId: string;
  capturedAt?: string;
  strokes: StudentBoardStroke[];
  snapshot: StudentBoardSnapshot;
};

export type CreateVoiceSubmissionEvidenceInput = {
  lessonId: string;
  state: ClassroomState;
  activeTurn: TutorTurnPlan;
  utteranceId: string;
  transcript: string;
  startedAt?: string;
  endedAt?: string;
  confidence?: number;
  segments?: StudentVoiceTranscriptSegment[];
};

export function createBoardSubmissionEvidence({
  lessonId,
  state,
  activeTurn,
  submissionId,
  capturedAt = new Date().toISOString(),
  strokes,
  snapshot,
}: CreateBoardSubmissionEvidenceInput): StudentBoardEvidence {
  return {
    type: "board",
    submissionId,
    capturedAt,
    strokes,
    snapshot,
    reviewContext: createTutorReviewContext({
      lessonId,
      state,
      activeTurn,
    }),
  };
}

export function createVoiceSubmissionEvidence({
  lessonId,
  state,
  activeTurn,
  utteranceId,
  transcript,
  startedAt,
  endedAt,
  confidence,
  segments,
}: CreateVoiceSubmissionEvidenceInput): StudentVoiceEvidence {
  const normalizedTranscript = normalizeStudentVoiceTranscript(transcript);
  const safeTimestamp = endedAt ?? startedAt ?? new Date().toISOString();

  return {
    type: "voice",
    utteranceId,
    transcript,
    normalizedTranscript,
    startedAt: startedAt ?? safeTimestamp,
    endedAt: endedAt ?? safeTimestamp,
    confidence,
    segments,
    reviewContext: createTutorReviewContext({
      lessonId,
      state,
      activeTurn,
    }),
  };
}

export function combineStudentEvidence(
  voice: StudentVoiceEvidence,
  board: StudentBoardEvidence,
): StudentCombinedEvidence {
  return {
    type: "both",
    voice,
    board,
  };
}

export function normalizeStudentVoiceTranscript(transcript: string) {
  return transcript.replace(/\s+/g, " ").trim();
}

export function createTutorReviewContext({
  lessonId,
  state,
  activeTurn,
}: {
  lessonId: string;
  state: ClassroomState;
  activeTurn: TutorTurnPlan;
}): TutorReviewContext {
  return {
    lessonId,
    turnId: activeTurn.turnId,
    state,
    expectsStudentEvidence: activeTurn.expectsStudentEvidence,
    prompt: getTurnPrompt(activeTurn.actions),
    actions: activeTurn.actions,
  };
}

function getTurnPrompt(actions: TutorAction[]) {
  const askAction = actions.find((action) => action.type === "ask");

  if (askAction?.type === "ask") {
    return askAction.prompt;
  }

  const speakAction = [...actions].reverse().find((action) => action.type === "speak");
  return speakAction?.type === "speak" ? speakAction.text : null;
}
