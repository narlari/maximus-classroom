import type { SessionEvent } from "@/lib/db";
import type { ClassroomState } from "@/lib/classroom-v2/types";
import type {
  LegacyClassroomSessionEventKind,
  LegacyClassroomSessionEventV2Metadata,
} from "@/lib/classroom-v2/event-logging";

type ProgressSignalStrength = "weak" | "medium" | "strong";

type ProgressSignalKind =
  | "practice_prompt"
  | "student_voice_attempt"
  | "student_board_attempt"
  | "tutor_feedback"
  | "session_notice";

type ProgressSignalActor = "student" | "tutor" | "system";

type ProgressSignalAction = LegacyClassroomSessionEventV2Metadata["v2Event"]["action"];

type ProgressSignalV2Event = {
  kind: LegacyClassroomSessionEventKind;
  state: ClassroomState;
  actor: ProgressSignalActor;
  action: ProgressSignalAction;
  prompt: string | null;
  turnId: string | null;
  expectsStudentEvidence: boolean;
};

export type ParentProgressSignal = {
  id: string;
  kind: ProgressSignalKind;
  actor: ProgressSignalActor;
  title: string;
  detail: string;
  timestamp: string;
  stateLabel: string | null;
  prompt: string | null;
  turnId: string | null;
  strength: ProgressSignalStrength;
};

export type ParentProgressSignalSummary = {
  structuredSignalCount: number;
  practicePromptCount: number;
  studentAttemptCount: number;
  voiceAttemptCount: number;
  boardAttemptCount: number;
  feedbackCount: number;
  latestPrompt: string | null;
};

export function buildParentProgressSignals(events: SessionEvent[]) {
  const signals = events
    .map((event) => toProgressSignal(event))
    .filter((signal): signal is ParentProgressSignal => signal !== null);

  const summary: ParentProgressSignalSummary = {
    structuredSignalCount: signals.length,
    practicePromptCount: signals.filter((signal) => signal.kind === "practice_prompt").length,
    studentAttemptCount: signals.filter(
      (signal) => signal.kind === "student_voice_attempt" || signal.kind === "student_board_attempt",
    ).length,
    voiceAttemptCount: signals.filter((signal) => signal.kind === "student_voice_attempt").length,
    boardAttemptCount: signals.filter((signal) => signal.kind === "student_board_attempt").length,
    feedbackCount: signals.filter((signal) => signal.kind === "tutor_feedback").length,
    latestPrompt: [...signals].reverse().find((signal) => signal.prompt)?.prompt ?? null,
  };

  return { signals, summary };
}

function toProgressSignal(event: SessionEvent): ParentProgressSignal | null {
  const v2Event = getV2Event(event);
  const content = normalizeContent(event.content);

  if (!v2Event) {
    return null;
  }

  if (v2Event.actor === "tutor" && v2Event.expectsStudentEvidence) {
    return {
      id: event.id,
      kind: "practice_prompt",
      actor: "tutor",
      title: "Practice opportunity opened",
      detail: v2Event.prompt ?? content ?? "Maximus opened a structured student turn.",
      timestamp: event.timestamp,
      stateLabel: formatStateLabel(v2Event.state),
      prompt: v2Event.prompt,
      turnId: v2Event.turnId,
      strength: "medium",
    };
  }

  if (v2Event.kind === "student_voice_exchange") {
    return {
      id: event.id,
      kind: "student_voice_attempt",
      actor: "student",
      title: "Student answered by voice",
      detail: content ?? v2Event.prompt ?? "Structured voice evidence captured.",
      timestamp: event.timestamp,
      stateLabel: formatStateLabel(v2Event.state),
      prompt: v2Event.prompt,
      turnId: v2Event.turnId,
      strength: "strong",
    };
  }

  if (v2Event.kind === "whiteboard_snapshot") {
    return {
      id: event.id,
      kind: "student_board_attempt",
      actor: "student",
      title: "Student submitted board work",
      detail: content ?? v2Event.prompt ?? "Structured board evidence captured for review.",
      timestamp: event.timestamp,
      stateLabel: formatStateLabel(v2Event.state),
      prompt: v2Event.prompt,
      turnId: v2Event.turnId,
      strength: "strong",
    };
  }

  if (v2Event.kind === "tutor_voice_exchange") {
    return {
      id: event.id,
      kind: "tutor_feedback",
      actor: "tutor",
      title: v2Event.expectsStudentEvidence ? "Maximus modeled the next step" : "Maximus gave feedback",
      detail: content ?? v2Event.prompt ?? "Tutor feedback captured.",
      timestamp: event.timestamp,
      stateLabel: formatStateLabel(v2Event.state),
      prompt: v2Event.prompt,
      turnId: v2Event.turnId,
      strength: v2Event.expectsStudentEvidence ? "medium" : "weak",
    };
  }

  if (v2Event.kind === "system_notice") {
    return {
      id: event.id,
      kind: "session_notice",
      actor: "system",
      title: "Structured session notice",
      detail: content ?? "System notice recorded.",
      timestamp: event.timestamp,
      stateLabel: formatStateLabel(v2Event.state),
      prompt: v2Event.prompt,
      turnId: v2Event.turnId,
      strength: "weak",
    };
  }

  return null;
}

function getV2Event(event: SessionEvent): ProgressSignalV2Event | null {
  const metadata = event.metadata;

  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const maybeV2Event = (metadata as Record<string, unknown>).v2Event;

  if (!maybeV2Event || typeof maybeV2Event !== "object") {
    return null;
  }

  const record = maybeV2Event as Record<string, unknown>;
  const kind = typeof record.kind === "string" ? record.kind : null;
  const state = typeof record.state === "string" ? record.state : null;
  const actor = typeof record.actor === "string" ? record.actor : null;
  const action = typeof record.action === "string" ? record.action : null;

  if (!kind || !state || !actor || !action) {
    return null;
  }

  return {
    kind: kind as ProgressSignalV2Event["kind"],
    state: state as ClassroomState,
    actor: actor as ProgressSignalActor,
    action: action as ProgressSignalAction,
    prompt: typeof record.prompt === "string" ? record.prompt : null,
    turnId: typeof record.turnId === "string" ? record.turnId : null,
    expectsStudentEvidence: Boolean(record.expectsStudentEvidence),
  };
}

function normalizeContent(content: string | null) {
  const trimmed = content?.trim();
  return trimmed ? trimmed : null;
}

function formatStateLabel(state: ClassroomState) {
  return state
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
