import type { SessionEvent } from "@/lib/db";
import type { ClassroomState } from "@/lib/classroom-v2/types";
import type {
  LegacyClassroomSessionEventKind,
  LegacyClassroomSessionEventV2Metadata,
} from "@/lib/classroom-v2/event-logging";

type ReviewCategory = "transcript" | "board" | "system" | "session";

type ReviewActor = "student" | "tutor" | "system";

type ReviewAction = LegacyClassroomSessionEventV2Metadata["v2Event"]["action"];

type ReviewV2Event = {
  kind: LegacyClassroomSessionEventKind;
  state: ClassroomState;
  actor: ReviewActor;
  action: ReviewAction;
  prompt: string | null;
  turnId: string | null;
  expectsStudentEvidence: boolean;
};

export type ParentReviewTranscriptEntry = {
  id: string;
  actor: "student" | "tutor";
  label: string;
  content: string;
  timestamp: string;
  stateLabel: string | null;
  prompt: string | null;
};

export type ParentReviewKeyEvent = {
  id: string;
  category: ReviewCategory;
  actor: ReviewActor;
  title: string;
  detail: string;
  timestamp: string;
  stateLabel: string | null;
  actionLabel: string | null;
  prompt: string | null;
  flagged: boolean;
};

export function buildParentReviewArtifacts(events: SessionEvent[]) {
  const transcript = events
    .map((event) => toTranscriptEntry(event))
    .filter((entry): entry is ParentReviewTranscriptEntry => entry !== null);

  const keyEvents = events
    .map((event) => toKeyEvent(event))
    .filter((entry): entry is ParentReviewKeyEvent => entry !== null);

  return { transcript, keyEvents };
}

function toTranscriptEntry(event: SessionEvent): ParentReviewTranscriptEntry | null {
  const v2Event = getV2Event(event);
  const content = normalizeContent(event.content);

  if (!content) {
    return null;
  }

  if (v2Event?.actor === "student") {
    return {
      id: event.id,
      actor: "student",
      label: "🎤 Student response",
      content,
      timestamp: event.timestamp,
      stateLabel: formatStateLabel(v2Event.state),
      prompt: v2Event.prompt,
    };
  }

  if (v2Event?.actor === "tutor") {
    return {
      id: event.id,
      actor: "tutor",
      label: "🤖 Maximus instruction",
      content,
      timestamp: event.timestamp,
      stateLabel: formatStateLabel(v2Event.state),
      prompt: v2Event.prompt,
    };
  }

  const fallbackRole = getLegacyTranscriptRole(event);

  if (!fallbackRole) {
    return null;
  }

  return {
    id: event.id,
    actor: fallbackRole,
    label: fallbackRole === "student" ? "🎤 Student response" : "🤖 Maximus instruction",
    content,
    timestamp: event.timestamp,
    stateLabel: null,
    prompt: null,
  };
}

function toKeyEvent(event: SessionEvent): ParentReviewKeyEvent | null {
  const v2Event = getV2Event(event);
  const content = normalizeContent(event.content);

  if (v2Event) {
    return {
      id: event.id,
      category: mapCategory(v2Event),
      actor: v2Event.actor,
      title: formatEventTitle(v2Event),
      detail: formatEventDetail(v2Event, content),
      timestamp: event.timestamp,
      stateLabel: formatStateLabel(v2Event.state),
      actionLabel: formatActionLabel(v2Event.action),
      prompt: v2Event.prompt,
      flagged: event.flagged,
    };
  }

  if (!content && !event.eventType) {
    return null;
  }

  return {
    id: event.id,
    category: event.eventType === "whiteboard_snapshot" ? "board" : "session",
    actor: getLegacyTranscriptRole(event) ?? "system",
    title: formatLegacyEventType(event.eventType),
    detail: content ?? "No content.",
    timestamp: event.timestamp,
    stateLabel: null,
    actionLabel: null,
    prompt: null,
    flagged: event.flagged,
  };
}

function getV2Event(event: SessionEvent): ReviewV2Event | null {
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
    kind: kind as ReviewV2Event["kind"],
    state: state as ClassroomState,
    actor: actor as ReviewActor,
    action: action as ReviewAction,
    prompt: typeof record.prompt === "string" ? record.prompt : null,
    turnId: typeof record.turnId === "string" ? record.turnId : null,
    expectsStudentEvidence: Boolean(record.expectsStudentEvidence),
  };
}

function getLegacyTranscriptRole(event: SessionEvent): "student" | "tutor" | null {
  const role = typeof event.metadata?.role === "string" ? event.metadata.role.toLowerCase() : "";
  const speaker = typeof event.metadata?.speaker === "string" ? event.metadata.speaker.toLowerCase() : "";

  if (role === "student" || speaker === "student") {
    return "student";
  }

  if (role === "tutor" || speaker === "tutor" || speaker === "assistant") {
    return "tutor";
  }

  return null;
}

function mapCategory(v2Event: ReviewV2Event): ReviewCategory {
  switch (v2Event.kind) {
    case "student_voice_exchange":
    case "tutor_voice_exchange":
      return "transcript";
    case "whiteboard_snapshot":
      return "board";
    case "system_notice":
      return v2Event.state === "ended" ? "session" : "system";
    default:
      return "session";
  }
}

function formatEventTitle(v2Event: ReviewV2Event) {
  switch (v2Event.kind) {
    case "student_voice_exchange":
      return "Student answered by voice";
    case "tutor_voice_exchange":
      return "Maximus spoke to the student";
    case "whiteboard_snapshot":
      return "Student board work captured";
    case "system_notice":
      return v2Event.state === "ended" ? "Session notice" : "System notice";
    default:
      return "Session event";
  }
}

function formatEventDetail(v2Event: ReviewV2Event, content: string | null) {
  switch (v2Event.kind) {
    case "student_voice_exchange":
      return content ?? "Student voice transcript captured.";
    case "tutor_voice_exchange":
      return content ?? "Tutor instruction captured.";
    case "whiteboard_snapshot":
      return content ?? "Whiteboard snapshot saved for tutor review.";
    case "system_notice":
      return content ?? "System notice recorded.";
    default:
      return content ?? "No content.";
  }
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

function formatActionLabel(action: ReviewAction) {
  return action
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" • ");
}

function formatLegacyEventType(eventType: string) {
  return eventType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
