import type { ClassroomState, TutorReviewContext, TutorTurnPlan } from "@/lib/classroom-v2/types";
import { createVoiceEvidenceFromBrowserTranscriptEvent } from "@/lib/classroom-v2/voice-transcript";
import type { BrowserStudentTranscriptEvent } from "@/lib/realtime";

export type LegacyClassroomSessionEventKind =
  | "student_voice_exchange"
  | "tutor_voice_exchange"
  | "whiteboard_snapshot"
  | "system_notice";

export type LegacyClassroomSessionEventV2Metadata = {
  source: "legacy_voice_session";
  schema: "classroom.v2.session-event.v1";
  v2Event: {
    kind: LegacyClassroomSessionEventKind;
    state: ClassroomState;
    actor: "student" | "tutor" | "system";
    action:
      | "student.answer.voice"
      | "tutor.turn.speak"
      | "student.answer.board_context"
      | "session.notice";
    prompt: string | null;
    turnId: string | null;
    expectsStudentEvidence: boolean;
  };
  transcriptEventType?: string;
  transcriptCapturedAt?: string;
  v2VoiceEvidence?: ReturnType<typeof createVoiceEvidenceFromBrowserTranscriptEvent>;
  v2BoardEvidence?: {
    capturedAt: string;
    source: string;
    summary: string | null;
    reviewContext: TutorReviewContext | null;
  };
  noticeReason?: string;
  whiteboardSource?: string;
};

export function createLegacyStudentVoiceEventMetadata({
  lessonId,
  activeTurn,
  transcriptEvent,
}: {
  lessonId: string;
  activeTurn: TutorTurnPlan;
  transcriptEvent: BrowserStudentTranscriptEvent;
}): LegacyClassroomSessionEventV2Metadata {
  return {
    source: "legacy_voice_session",
    schema: "classroom.v2.session-event.v1",
    transcriptEventType: transcriptEvent.eventType ?? undefined,
    transcriptCapturedAt: transcriptEvent.receivedAt,
    v2Event: createV2EventMetadata({
      kind: "student_voice_exchange",
      state: "student_answering",
      actor: "student",
      action: "student.answer.voice",
      activeTurn,
    }),
    v2VoiceEvidence: createVoiceEvidenceFromBrowserTranscriptEvent({
      lessonId,
      activeTurn,
      transcriptEvent,
    }),
  };
}

export function createLegacyTutorVoiceEventMetadata(transcript: string): LegacyClassroomSessionEventV2Metadata {
  return {
    source: "legacy_voice_session",
    schema: "classroom.v2.session-event.v1",
    v2Event: {
      kind: "tutor_voice_exchange",
      state: "tutor_speaking",
      actor: "tutor",
      action: "tutor.turn.speak",
      prompt: transcript.trim() || null,
      turnId: null,
      expectsStudentEvidence: false,
    },
  };
}

export function createLegacyWhiteboardSnapshotEventMetadata({
  source,
  description,
  capturedAt,
  activeTurn,
}: {
  source: string;
  description?: string | null;
  capturedAt?: string;
  activeTurn?: TutorTurnPlan | null;
}): LegacyClassroomSessionEventV2Metadata {
  return {
    source: "legacy_voice_session",
    schema: "classroom.v2.session-event.v1",
    whiteboardSource: source,
    v2Event: createV2EventMetadata({
      kind: "whiteboard_snapshot",
      state: "student_answering",
      actor: "student",
      action: "student.answer.board_context",
      activeTurn: activeTurn ?? null,
    }),
    v2BoardEvidence: {
      capturedAt: capturedAt ?? new Date().toISOString(),
      source,
      summary: description?.trim() || null,
      reviewContext: activeTurn ? createReviewContextFromTurn(activeTurn) : null,
    },
  };
}

export function createLegacySystemNoticeEventMetadata({
  reason,
  activeTurn,
}: {
  reason: string;
  activeTurn?: TutorTurnPlan | null;
}): LegacyClassroomSessionEventV2Metadata {
  return {
    source: "legacy_voice_session",
    schema: "classroom.v2.session-event.v1",
    noticeReason: reason,
    v2Event: createV2EventMetadata({
      kind: "system_notice",
      state: mapNoticeReasonToState(reason),
      actor: "system",
      action: "session.notice",
      activeTurn: activeTurn ?? null,
    }),
  };
}

function createV2EventMetadata({
  kind,
  state,
  actor,
  action,
  activeTurn,
}: {
  kind: LegacyClassroomSessionEventKind;
  state: ClassroomState;
  actor: LegacyClassroomSessionEventV2Metadata["v2Event"]["actor"];
  action: LegacyClassroomSessionEventV2Metadata["v2Event"]["action"];
  activeTurn?: TutorTurnPlan | null;
}) {
  return {
    kind,
    state,
    actor,
    action,
    prompt: getTurnPrompt(activeTurn ?? null),
    turnId: activeTurn?.turnId ?? null,
    expectsStudentEvidence: activeTurn?.expectsStudentEvidence ?? false,
  };
}

function getTurnPrompt(activeTurn: TutorTurnPlan | null) {
  if (!activeTurn) {
    return null;
  }

  const askAction = activeTurn.actions.find((action) => action.type === "ask");

  if (askAction?.type === "ask") {
    return askAction.prompt;
  }

  const speakAction = [...activeTurn.actions].reverse().find((action) => action.type === "speak");
  return speakAction?.type === "speak" ? speakAction.text : null;
}

function createReviewContextFromTurn(activeTurn: TutorTurnPlan): TutorReviewContext {
  return {
    lessonId: "legacy-voice-session",
    turnId: activeTurn.turnId,
    state: "student_answering",
    expectsStudentEvidence: activeTurn.expectsStudentEvidence,
    prompt: getTurnPrompt(activeTurn),
    actions: activeTurn.actions,
  };
}

function mapNoticeReasonToState(reason: string): ClassroomState {
  switch (reason) {
    case "idle_timeout":
    case "max_duration_reached":
    case "cost_cap_reached":
      return "ended";
    default:
      return "student_answering";
  }
}
