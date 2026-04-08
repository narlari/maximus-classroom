import { createVoiceSubmissionEvidence } from "@/lib/classroom-v2/review";
import type { ClassroomState, StudentVoiceEvidence, TutorTurnPlan } from "@/lib/classroom-v2/types";
import type { BrowserStudentTranscriptEvent } from "@/lib/realtime";

export type BrowserTranscriptVoiceCaptureInput = {
  lessonId: string;
  state?: ClassroomState;
  activeTurn: TutorTurnPlan;
  transcriptEvent: BrowserStudentTranscriptEvent;
  utteranceId?: string;
};

export function createVoiceEvidenceFromBrowserTranscriptEvent({
  lessonId,
  state = "student_answering",
  activeTurn,
  transcriptEvent,
  utteranceId,
}: BrowserTranscriptVoiceCaptureInput): StudentVoiceEvidence {
  return createVoiceSubmissionEvidence({
    lessonId,
    state,
    activeTurn,
    utteranceId: utteranceId ?? createDefaultTranscriptUtteranceId(transcriptEvent),
    transcript: transcriptEvent.transcript,
    startedAt: transcriptEvent.receivedAt,
    endedAt: transcriptEvent.receivedAt,
  });
}

export function createLegacyVoiceReviewTurn(prompt: string | null): TutorTurnPlan {
  const normalizedPrompt = prompt?.trim() || "Speak your answer out loud.";

  return {
    turnId: "legacy-browser-realtime-student-turn",
    expectsStudentEvidence: true,
    actions: [{ type: "ask", prompt: normalizedPrompt }],
  };
}

function createDefaultTranscriptUtteranceId(event: BrowserStudentTranscriptEvent) {
  return `browser-transcript-${event.receivedAt}`;
}
