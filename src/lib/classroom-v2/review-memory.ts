export const CLASSROOM_V2_REVIEW_MEMORY_VERSION = 1;
export const CLASSROOM_V2_REVIEW_MEMORY_STORAGE_KEY = "maximus-classroom:v2-review-memory";

export type ClassroomV2ReviewBeatKey =
  | "teacher-setup"
  | "student-turn"
  | "review-handoff"
  | "lesson-close";

export type ClassroomV2ReviewBeatMemory = {
  key: ClassroomV2ReviewBeatKey;
  label: string;
  detail: string;
  done: boolean;
};

export type ClassroomV2ReviewMemoryRecord = {
  version: number;
  studentId: string;
  studentName?: string;
  updatedAt: string;
  confirmedCount: number;
  totalCount: number;
  beats: ClassroomV2ReviewBeatMemory[];
};

export type ClassroomV2ReviewGuidance = {
  mode: "start" | "continue" | "recheck";
  headline: string;
  detail: string;
  summary: string;
  nextBeat: ClassroomV2ReviewBeatMemory | null;
};

export type ClassroomV2ReviewLaunchHandoff = {
  mode: ClassroomV2ReviewGuidance["mode"];
  beatKey: ClassroomV2ReviewBeatKey | null;
  targeted: boolean;
};

export type ClassroomV2ReviewReturnReport = {
  mode: ClassroomV2ReviewGuidance["mode"];
  beatKey: ClassroomV2ReviewBeatKey | null;
  targeted: boolean;
  confirmed: boolean;
};

export function getClassroomV2ReviewMemoryKey(studentId: string) {
  return `${CLASSROOM_V2_REVIEW_MEMORY_STORAGE_KEY}:${studentId}`;
}

export function readClassroomV2ReviewMemory(studentId: string): ClassroomV2ReviewMemoryRecord | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getClassroomV2ReviewMemoryKey(studentId));

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as ClassroomV2ReviewMemoryRecord;

    if (!parsed || parsed.version !== CLASSROOM_V2_REVIEW_MEMORY_VERSION || parsed.studentId !== studentId) {
      return null;
    }

    if (!Array.isArray(parsed.beats)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeClassroomV2ReviewMemory(record: ClassroomV2ReviewMemoryRecord) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getClassroomV2ReviewMemoryKey(record.studentId), JSON.stringify(record));
}

export function clearClassroomV2ReviewMemory(studentId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getClassroomV2ReviewMemoryKey(studentId));
}

export function buildClassroomV2ReviewMemoryRecord({
  studentId,
  studentName,
  beats,
  updatedAt = new Date().toISOString(),
}: {
  studentId: string;
  studentName?: string;
  beats: ClassroomV2ReviewBeatMemory[];
  updatedAt?: string;
}): ClassroomV2ReviewMemoryRecord {
  const confirmedCount = beats.filter((beat) => beat.done).length;

  return {
    version: CLASSROOM_V2_REVIEW_MEMORY_VERSION,
    studentId,
    studentName,
    updatedAt,
    confirmedCount,
    totalCount: beats.length,
    beats,
  };
}

export function getClassroomV2ReviewGuidance(
  memory: ClassroomV2ReviewMemoryRecord | null,
): ClassroomV2ReviewGuidance {
  if (!memory || memory.confirmedCount === 0) {
    return {
      mode: "start",
      headline: "Start the V2 review seam from this classroom route.",
      detail:
        "No remembered review beats exist yet for this student, so the next pass should begin by launching preview and confirming the first route-level teaching beat.",
      summary: "No remembered route-level V2 review progress yet.",
      nextBeat: null,
    };
  }

  const nextBeat = memory.beats.find((beat) => !beat.done) ?? null;

  if (nextBeat) {
    return {
      mode: "continue",
      headline: "Continue the V2 review seam from the last remembered checkpoint.",
      detail:
        "Some review beats are already confirmed, so the route should resume review instead of starting over. The next unconfirmed beat below is the clearest place to pick back up.",
      summary: `${memory.confirmedCount} of ${memory.totalCount} route-level review beats are confirmed.`,
      nextBeat,
    };
  }

  return {
    mode: "recheck",
    headline: "Re-check the V2 review seam from this route when you want a fresh confidence pass.",
    detail:
      "All remembered review beats are confirmed, so the route-level review pass is complete. Relaunch preview only to revisit the seam, sanity-check it again, or confirm nothing regressed.",
    summary: `Route-level V2 review pass complete: ${memory.confirmedCount} of ${memory.totalCount} beats confirmed.`,
    nextBeat: null,
  };
}

export function getClassroomV2ReviewLaunchHandoff(
  memory: ClassroomV2ReviewMemoryRecord | null,
): ClassroomV2ReviewLaunchHandoff {
  const guidance = getClassroomV2ReviewGuidance(memory);

  return {
    mode: guidance.mode,
    beatKey: guidance.nextBeat?.key ?? (guidance.mode === "recheck" ? "lesson-close" : null),
    targeted: false,
  };
}

export function getClassroomV2TargetedReviewLaunchHandoff({
  memory,
  beatKey,
}: {
  memory: ClassroomV2ReviewMemoryRecord | null;
  beatKey: ClassroomV2ReviewBeatKey;
}): ClassroomV2ReviewLaunchHandoff {
  const guidance = getClassroomV2ReviewGuidance(memory);

  return {
    mode: guidance.mode,
    beatKey,
    targeted: true,
  };
}

export function appendClassroomV2ReviewLaunchHandoff(previewHref: string, handoff: ClassroomV2ReviewLaunchHandoff) {
  const params = new URLSearchParams();
  params.set("reviewMode", handoff.mode);

  if (handoff.beatKey) {
    params.set("reviewBeat", handoff.beatKey);
  }

  if (handoff.targeted) {
    params.set("reviewTargeted", "1");
  }

  const query = params.toString();
  return query ? `${previewHref}&${query}` : previewHref;
}

export function appendClassroomV2ReviewReturnReport(
  legacyHref: string,
  report: ClassroomV2ReviewReturnReport,
) {
  const params = new URLSearchParams();
  params.set("reviewMode", report.mode);

  if (report.beatKey) {
    params.set("reviewBeat", report.beatKey);
  }

  if (report.targeted) {
    params.set("reviewTargeted", "1");
  }

  params.set("reviewReturned", "1");
  params.set("reviewConfirmed", report.confirmed ? "1" : "0");

  const query = params.toString();
  return query ? `${legacyHref}?${query}` : legacyHref;
}

export function parseClassroomV2ReviewReturnReport(value: {
  reviewMode?: string | string[];
  reviewBeat?: string | string[];
  reviewTargeted?: string | string[];
  reviewReturned?: string | string[];
  reviewConfirmed?: string | string[];
}): ClassroomV2ReviewReturnReport | null {
  const returned = readFirstQueryValue(value.reviewReturned);

  if (returned !== "1") {
    return null;
  }

  const mode = readFirstQueryValue(value.reviewMode);

  if (mode !== "start" && mode !== "continue" && mode !== "recheck") {
    return null;
  }

  const rawBeat = readFirstQueryValue(value.reviewBeat);
  const beatKey =
    rawBeat === "teacher-setup" ||
    rawBeat === "student-turn" ||
    rawBeat === "review-handoff" ||
    rawBeat === "lesson-close"
      ? rawBeat
      : null;

  return {
    mode,
    beatKey,
    targeted: readFirstQueryValue(value.reviewTargeted) === "1",
    confirmed: readFirstQueryValue(value.reviewConfirmed) === "1",
  };
}

function readFirstQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
