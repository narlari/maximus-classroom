import type { SessionEvent, SkillProgress } from "@/lib/db";
import type { ClassroomState, TutorAction } from "@/lib/classroom-v2/types";
import type {
  LegacyClassroomSessionEventKind,
  LegacyClassroomSessionEventV2Metadata,
} from "@/lib/classroom-v2/event-logging";

type ProgressHintActor = "student" | "tutor" | "system";
type ProgressHintAction = LegacyClassroomSessionEventV2Metadata["v2Event"]["action"];

type ProgressHintV2Event = {
  kind: LegacyClassroomSessionEventKind;
  state: ClassroomState;
  actor: ProgressHintActor;
  action: ProgressHintAction;
  prompt: string | null;
  turnId: string | null;
  expectsStudentEvidence: boolean;
};

type VoiceEvidenceMetadata = {
  confidence?: number;
  normalizedTranscript?: string;
  reviewContext?: {
    actions?: TutorAction[];
  };
};

type BoardEvidenceMetadata = {
  capturedAt?: string;
  source?: string;
  summary?: string;
  reviewContext?: {
    actions?: TutorAction[];
  };
};

type ParentProgressHintRubric = {
  responseModality: "voice" | "board" | "voice+board" | "review";
  evidenceCompleteness: "light" | "partial" | "complete";
  contextRichness: "limited" | "guided" | "rich";
  strategyMarkersPresent: boolean;
  promptLinkedEvidence: boolean;
};

export type ParentProgressHintCard = {
  id: string;
  title: string;
  timestamp: string;
  stateLabel: string | null;
  turnId: string | null;
  standards: string[];
  domains: string[];
  evaluatorLabels: string[];
  scoringInputs: string[];
  evidenceSummary: string;
  confidenceLabel: string | null;
  boardContextSummary: string | null;
  rubric: ParentProgressHintRubric;
  parentExplanation: string;
};

export type ParentProgressHintSummary = {
  hintCount: number;
  domainTags: string[];
  standards: string[];
  evaluatorLabels: string[];
  boardEvidenceCount: number;
  voiceEvidenceCount: number;
  combinedEvidenceCount: number;
  promptLinkedCount: number;
  strategyMarkerCount: number;
};

export function buildParentProgressHints(events: SessionEvent[], skillProgress?: SkillProgress[]) {
  const hintCards = collapseHintCards(
    events
      .map((event) => toProgressHintCard(event, skillProgress ?? []))
      .filter((card): card is ParentProgressHintCard => card !== null),
  );

  const summary: ParentProgressHintSummary = {
    hintCount: hintCards.length,
    domainTags: unique(hintCards.flatMap((card) => card.domains)),
    standards: unique(hintCards.flatMap((card) => card.standards)),
    evaluatorLabels: unique(hintCards.flatMap((card) => card.evaluatorLabels)),
    boardEvidenceCount: hintCards.filter((card) => card.evaluatorLabels.includes("board-evidence")).length,
    voiceEvidenceCount: hintCards.filter((card) => card.evaluatorLabels.includes("voice-evidence")).length,
    combinedEvidenceCount: hintCards.filter((card) => card.evaluatorLabels.includes("combined-evidence")).length,
    promptLinkedCount: hintCards.filter((card) => card.rubric.promptLinkedEvidence).length,
    strategyMarkerCount: hintCards.filter((card) => card.rubric.strategyMarkersPresent).length,
  };

  return { hintCards, summary };
}

function toProgressHintCard(event: SessionEvent, skillProgress: SkillProgress[]): ParentProgressHintCard | null {
  const v2Event = getV2Event(event);

  if (!v2Event) {
    return null;
  }

  const content = normalizeText(event.content);
  const voiceEvidence = getVoiceEvidence(event);
  const boardEvidence = getBoardEvidence(event);
  const teacherActions =
    voiceEvidence?.reviewContext?.actions ?? boardEvidence?.reviewContext?.actions ?? [];
  const sourceTexts = [
    v2Event.prompt,
    content,
    voiceEvidence?.normalizedTranscript,
    boardEvidence?.summary,
    getTeacherActionText(teacherActions),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  const domains = inferDomains(sourceTexts, teacherActions);
  const standards = matchCandidateStandards(domains, sourceTexts, skillProgress);
  const evaluatorLabels = inferEvaluatorLabels(v2Event, voiceEvidence, boardEvidence);
  const scoringInputs = inferScoringInputs(v2Event, voiceEvidence, boardEvidence, teacherActions);
  const rubric = inferRubric(v2Event, voiceEvidence, boardEvidence, teacherActions);
  const evidenceSummary = buildEvidenceSummary(v2Event, voiceEvidence, boardEvidence, teacherActions);
  const confidenceLabel = formatConfidenceLabel(voiceEvidence?.confidence);
  const boardContextSummary = buildBoardContextSummary(boardEvidence, teacherActions);
  const parentExplanation = buildParentExplanation(v2Event, rubric, boardEvidence, teacherActions);

  if (!domains.length && !standards.length && !evaluatorLabels.length && !scoringInputs.length) {
    return null;
  }

  return {
    id: event.id,
    title: formatHintTitle(v2Event, evaluatorLabels),
    timestamp: event.timestamp,
    stateLabel: formatStateLabel(v2Event.state),
    turnId: v2Event.turnId,
    standards,
    domains,
    evaluatorLabels,
    scoringInputs,
    evidenceSummary,
    confidenceLabel,
    boardContextSummary,
    rubric,
    parentExplanation,
  };
}

function collapseHintCards(cards: ParentProgressHintCard[]) {
  const byTurn = new Map<string, ParentProgressHintCard>();
  const standalone: ParentProgressHintCard[] = [];

  for (const card of cards) {
    if (!card.turnId) {
      standalone.push(card);
      continue;
    }

    const existing = byTurn.get(card.turnId);

    if (!existing) {
      byTurn.set(card.turnId, card);
      continue;
    }

    const evaluatorLabels = unique([...existing.evaluatorLabels, ...card.evaluatorLabels]);
    const scoringInputs = unique([...existing.scoringInputs, ...card.scoringInputs]);
    const hasVoice = evaluatorLabels.includes("voice-evidence");
    const hasBoard = evaluatorLabels.includes("board-evidence");

    if (hasVoice && hasBoard) {
      evaluatorLabels.push("combined-evidence");
      scoringInputs.push("voice-and-board-aligned");
    }

    byTurn.set(card.turnId, {
      ...existing,
      title: hasVoice && hasBoard ? "Evaluator-ready combined hint" : existing.title,
      timestamp: card.timestamp > existing.timestamp ? card.timestamp : existing.timestamp,
      standards: unique([...existing.standards, ...card.standards]),
      domains: unique([...existing.domains, ...card.domains]),
      evaluatorLabels: unique(evaluatorLabels),
      scoringInputs: unique(scoringInputs),
      evidenceSummary: unique([existing.evidenceSummary, card.evidenceSummary]).join(" • "),
      confidenceLabel: existing.confidenceLabel ?? card.confidenceLabel,
      boardContextSummary: existing.boardContextSummary ?? card.boardContextSummary,
      rubric: mergeRubric(existing.rubric, card.rubric),
      parentExplanation:
        hasVoice && hasBoard
          ? buildCombinedParentExplanation(existing.parentExplanation, card.parentExplanation)
          : existing.parentExplanation,
    });
  }

  return [...byTurn.values(), ...standalone].sort((left, right) =>
    right.timestamp.localeCompare(left.timestamp),
  );
}

function getV2Event(event: SessionEvent): ProgressHintV2Event | null {
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
    kind: kind as ProgressHintV2Event["kind"],
    state: state as ClassroomState,
    actor: actor as ProgressHintActor,
    action: action as ProgressHintAction,
    prompt: typeof record.prompt === "string" ? record.prompt : null,
    turnId: typeof record.turnId === "string" ? record.turnId : null,
    expectsStudentEvidence: Boolean(record.expectsStudentEvidence),
  };
}

function getVoiceEvidence(event: SessionEvent): VoiceEvidenceMetadata | null {
  const metadata = event.metadata;

  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const raw = (metadata as Record<string, unknown>).v2VoiceEvidence;

  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const reviewContext =
    record.reviewContext && typeof record.reviewContext === "object"
      ? (record.reviewContext as { actions?: TutorAction[] })
      : undefined;

  return {
    confidence: typeof record.confidence === "number" ? record.confidence : undefined,
    normalizedTranscript:
      typeof record.normalizedTranscript === "string" ? record.normalizedTranscript : undefined,
    reviewContext,
  };
}

function getBoardEvidence(event: SessionEvent): BoardEvidenceMetadata | null {
  const metadata = event.metadata;

  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const raw = (metadata as Record<string, unknown>).v2BoardEvidence;

  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const reviewContext =
    record.reviewContext && typeof record.reviewContext === "object"
      ? (record.reviewContext as { actions?: TutorAction[] })
      : undefined;

  return {
    capturedAt: typeof record.capturedAt === "string" ? record.capturedAt : undefined,
    source: typeof record.source === "string" ? record.source : undefined,
    summary: typeof record.summary === "string" ? record.summary : undefined,
    reviewContext,
  };
}

function inferDomains(sourceText: string, actions: TutorAction[]) {
  const normalized = sourceText.toLowerCase();
  const actionTypes = actions.map((action) => action.type);
  const domains: string[] = [];

  if (
    /fraction|equivalent|denominator|numerator|\d+\s*\/\s*\d+/.test(normalized)
  ) {
    domains.push("Fractions");
  }

  if (
    /angle|line|ray|point|shape|triangle|rectangle|polygon|geometry|perimeter/.test(normalized)
  ) {
    domains.push("Geometry");
  }

  if (
    /inch|inches|cm|centimeter|length|measure|time|clock|minute|hour|area/.test(normalized)
  ) {
    domains.push("Measurement");
  }

  if (
    /place value|tens|ones|hundreds|thousands|regroup|borrow|carry|base ten/.test(normalized)
  ) {
    domains.push("Number & Base Ten");
  }

  if (
    /add|sum|subtract|difference|minus|plus|multiply|product|divide|quotient|equation|word problem/.test(
      normalized,
    ) || actionTypes.includes("board.writeProblem")
  ) {
    domains.push("Operations");
  }

  if (actionTypes.includes("board.stepBox") || actionTypes.includes("board.highlight")) {
    domains.push("Reviewable strategy");
  }

  return unique(domains);
}

function matchCandidateStandards(domains: string[], sourceText: string, skillProgress: SkillProgress[]) {
  const normalized = sourceText.toLowerCase();

  const matches = skillProgress.filter((skill) => {
    const domainMatch = domains.includes(getDomainName(skill.standardCode));
    const name = `${skill.standardCode} ${skill.standardName ?? ""}`.toLowerCase();

    if (normalized.includes(skill.standardCode.toLowerCase())) {
      return true;
    }

    if (domainMatch && overlapsConcept(name, normalized)) {
      return true;
    }

    return false;
  });

  return unique(matches.map((skill) => skill.standardCode));
}

function inferEvaluatorLabels(
  v2Event: ProgressHintV2Event,
  voiceEvidence: VoiceEvidenceMetadata | null,
  boardEvidence: BoardEvidenceMetadata | null,
) {
  const labels: string[] = [];

  if (v2Event.expectsStudentEvidence) {
    labels.push("practice-turn");
  }

  if (v2Event.kind === "student_voice_exchange") {
    labels.push("voice-evidence");
  }

  if (v2Event.kind === "whiteboard_snapshot") {
    labels.push("board-evidence");
  }

  if (voiceEvidence && boardEvidence) {
    labels.push("combined-evidence");
  }

  if (boardEvidence?.reviewContext?.actions?.length) {
    labels.push("board-context-packaged");
  }

  if (v2Event.kind === "tutor_voice_exchange" && !v2Event.expectsStudentEvidence) {
    labels.push("feedback-turn");
  }

  if (v2Event.kind === "tutor_voice_exchange" && v2Event.expectsStudentEvidence) {
    labels.push("modeled-next-step");
  }

  if (voiceEvidence?.confidence !== undefined) {
    labels.push("confidence-available");
  }

  return unique(labels);
}

function inferScoringInputs(
  v2Event: ProgressHintV2Event,
  voiceEvidence: VoiceEvidenceMetadata | null,
  boardEvidence: BoardEvidenceMetadata | null,
  actions: TutorAction[],
) {
  const inputs: string[] = [];

  if (v2Event.prompt) {
    inputs.push("prompt-linked");
  }

  if (v2Event.kind === "student_voice_exchange") {
    inputs.push("spoken-answer-observed");
  }

  if (v2Event.kind === "whiteboard_snapshot") {
    inputs.push("board-submission-observed");
  }

  if (voiceEvidence && boardEvidence) {
    inputs.push("voice-and-board-aligned");
  }

  if (actions.some((action) => action.type === "board.writeProblem")) {
    inputs.push("teacher-problem-context");
  }

  if (actions.some((action) => action.type === "board.stepBox" || action.type === "board.highlight")) {
    inputs.push("strategy-markers-present");
  }

  if (boardEvidence?.summary) {
    inputs.push("board-work-summary");
  }

  if (boardEvidence?.source) {
    inputs.push("board-source-tagged");
  }

  if (voiceEvidence?.normalizedTranscript) {
    inputs.push("normalized-voice-transcript");
  }

  return unique(inputs);
}

function inferRubric(
  v2Event: ProgressHintV2Event,
  voiceEvidence: VoiceEvidenceMetadata | null,
  boardEvidence: BoardEvidenceMetadata | null,
  actions: TutorAction[],
): ParentProgressHintRubric {
  const responseModality = getResponseModality(v2Event, voiceEvidence, boardEvidence);
  const promptLinkedEvidence = Boolean(v2Event.prompt);
  const strategyMarkersPresent = actions.some(
    (action) => action.type === "board.stepBox" || action.type === "board.highlight",
  );
  const hasTeacherProblem = actions.some((action) => action.type === "board.writeProblem");
  const hasVoiceTranscript = Boolean(voiceEvidence?.normalizedTranscript);
  const hasBoardSummary = Boolean(boardEvidence?.summary);

  const evidencePieceCount = [hasVoiceTranscript, hasBoardSummary, promptLinkedEvidence].filter(Boolean).length;
  const evidenceCompleteness: ParentProgressHintRubric["evidenceCompleteness"] =
    responseModality === "voice+board" || evidencePieceCount >= 3
      ? "complete"
      : evidencePieceCount >= 2
        ? "partial"
        : "light";

  const contextSignalCount = [hasTeacherProblem, strategyMarkersPresent, Boolean(boardEvidence?.source)].filter(Boolean)
    .length;
  const contextRichness: ParentProgressHintRubric["contextRichness"] =
    contextSignalCount >= 3 ? "rich" : contextSignalCount >= 1 ? "guided" : "limited";

  return {
    responseModality,
    evidenceCompleteness,
    contextRichness,
    strategyMarkersPresent,
    promptLinkedEvidence,
  };
}

function buildEvidenceSummary(
  v2Event: ProgressHintV2Event,
  voiceEvidence: VoiceEvidenceMetadata | null,
  boardEvidence: BoardEvidenceMetadata | null,
  actions: TutorAction[],
) {
  const parts: string[] = [];

  if (voiceEvidence && boardEvidence) {
    parts.push("voice + board evidence aligned for the same turn");
  } else if (v2Event.kind === "student_voice_exchange") {
    parts.push("voice answer captured");
  } else if (v2Event.kind === "whiteboard_snapshot") {
    parts.push("board submission captured");
  }

  if (actions.length > 0) {
    parts.push(`${actions.length} teacher actions packaged`);
  }

  if (boardEvidence?.summary) {
    parts.push(`board: “${truncate(boardEvidence.summary, 72)}”`);
  }

  if (voiceEvidence?.normalizedTranscript) {
    parts.push(`transcript: “${truncate(voiceEvidence.normalizedTranscript, 72)}”`);
  }

  return parts.join(" • ") || "Structured V2 review metadata available.";
}

function buildBoardContextSummary(boardEvidence: BoardEvidenceMetadata | null, actions: TutorAction[]) {
  if (!boardEvidence && actions.length === 0) {
    return null;
  }

  const parts: string[] = [];

  if (boardEvidence?.source) {
    parts.push(`source: ${boardEvidence.source}`);
  }

  const teacherProblem = actions.find((action) => action.type === "board.writeProblem");
  if (teacherProblem?.type === "board.writeProblem") {
    parts.push(`teacher problem: ${truncate(teacherProblem.text, 72)}`);
  }

  const strategyMarkers = actions.filter(
    (action) => action.type === "board.stepBox" || action.type === "board.highlight",
  ).length;
  if (strategyMarkers > 0) {
    parts.push(`${strategyMarkers} strategy marker${strategyMarkers === 1 ? "" : "s"}`);
  }

  return parts.join(" • ") || null;
}

function buildParentExplanation(
  v2Event: ProgressHintV2Event,
  rubric: ParentProgressHintRubric,
  boardEvidence: BoardEvidenceMetadata | null,
  actions: TutorAction[],
) {
  const modalityLabel =
    rubric.responseModality === "voice+board"
      ? "voice and board"
      : rubric.responseModality === "review"
        ? "review metadata"
        : rubric.responseModality;

  const reasonParts = [`This card is reviewable because it captured ${modalityLabel} evidence`];

  if (rubric.promptLinkedEvidence) {
    reasonParts.push("that stays linked to the tutor prompt");
  }

  if (rubric.strategyMarkersPresent) {
    reasonParts.push("with visible strategy markers from the teacher context");
  } else if (actions.some((action) => action.type === "board.writeProblem")) {
    reasonParts.push("with the teacher problem context packaged alongside it");
  }

  if (boardEvidence?.summary && rubric.contextRichness !== "limited") {
    reasonParts.push("so a parent can review what the student produced in context");
  } else if (v2Event.expectsStudentEvidence) {
    reasonParts.push("for a student practice turn that expected evidence");
  }

  return `${reasonParts.join(" ")}.`;
}

function getResponseModality(
  v2Event: ProgressHintV2Event,
  voiceEvidence: VoiceEvidenceMetadata | null,
  boardEvidence: BoardEvidenceMetadata | null,
): ParentProgressHintRubric["responseModality"] {
  if (voiceEvidence && boardEvidence) {
    return "voice+board";
  }

  if (v2Event.kind === "student_voice_exchange" || voiceEvidence) {
    return "voice";
  }

  if (v2Event.kind === "whiteboard_snapshot" || boardEvidence) {
    return "board";
  }

  return "review";
}

function mergeRubric(
  existing: ParentProgressHintRubric,
  incoming: ParentProgressHintRubric,
): ParentProgressHintRubric {
  return {
    responseModality:
      existing.responseModality === incoming.responseModality
        ? existing.responseModality
        : existing.responseModality === "voice+board" || incoming.responseModality === "voice+board"
          ? "voice+board"
          : existing.responseModality === "review"
            ? incoming.responseModality
            : existing.responseModality,
    evidenceCompleteness: pickHigherEvidenceCompleteness(
      existing.evidenceCompleteness,
      incoming.evidenceCompleteness,
    ),
    contextRichness: pickHigherContextRichness(existing.contextRichness, incoming.contextRichness),
    strategyMarkersPresent: existing.strategyMarkersPresent || incoming.strategyMarkersPresent,
    promptLinkedEvidence: existing.promptLinkedEvidence || incoming.promptLinkedEvidence,
  };
}

function buildCombinedParentExplanation(existing: string, incoming: string) {
  if (existing === incoming) {
    return existing;
  }

  return "This card is reviewable because it combines voice and board evidence for the same turn, keeping the student response tied to the prompt and teacher context.";
}

function pickHigherEvidenceCompleteness(
  left: ParentProgressHintRubric["evidenceCompleteness"],
  right: ParentProgressHintRubric["evidenceCompleteness"],
): ParentProgressHintRubric["evidenceCompleteness"] {
  const rank = { light: 0, partial: 1, complete: 2 };
  return rank[left] >= rank[right] ? left : right;
}

function pickHigherContextRichness(
  left: ParentProgressHintRubric["contextRichness"],
  right: ParentProgressHintRubric["contextRichness"],
): ParentProgressHintRubric["contextRichness"] {
  const rank = { limited: 0, guided: 1, rich: 2 };
  return rank[left] >= rank[right] ? left : right;
}

function formatHintTitle(v2Event: ProgressHintV2Event, evaluatorLabels: string[]) {
  const isCombined = evaluatorLabels.includes("combined-evidence");

  switch (v2Event.kind) {
    case "student_voice_exchange":
      return isCombined ? "Evaluator-ready combined hint" : "Evaluator-ready voice hint";
    case "whiteboard_snapshot":
      return isCombined ? "Evaluator-ready combined hint" : "Evaluator-ready board hint";
    case "tutor_voice_exchange":
      return "Tutor review hint";
    case "system_notice":
      return "Structured review hint";
    default:
      return "Progress hint";
  }
}

function getTeacherActionText(actions: TutorAction[]) {
  return actions
    .map((action) => {
      switch (action.type) {
        case "ask":
          return action.prompt;
        case "speak":
          return action.text;
        case "board.writeProblem":
        case "board.writeText":
          return action.text;
        case "board.arrow":
          return action.label ?? "arrow";
        case "board.stepBox":
          return action.label ?? "step";
        case "board.highlight":
          return "highlight";
        case "board.underline":
          return "underline";
        case "board.clearTeacherLayer":
          return "clear";
        default:
          return "";
      }
    })
    .join(" ");
}

function formatStateLabel(state: ClassroomState) {
  return state
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatConfidenceLabel(confidence?: number) {
  if (confidence === undefined) {
    return null;
  }

  const percent = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
  return `${percent}% confidence`;
}

function overlapsConcept(skillName: string, sourceText: string) {
  const conceptWords = skillName
    .split(/[^a-z0-9]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 3);

  return conceptWords.some((word) => sourceText.includes(word));
}

function getDomainName(standardCode: string) {
  const domainCode = standardCode.split(".")[1] ?? "";
  const domainMap: Record<string, string> = {
    OA: "Operations",
    NBT: "Number & Base Ten",
    NF: "Fractions",
    G: "Geometry",
    MD: "Measurement",
  };

  return domainMap[domainCode] ?? "Other";
}

function normalizeText(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
