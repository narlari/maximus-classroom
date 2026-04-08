export const CANONICAL_WHITEBOARD_ARCHITECTURE_ID = "legacy-canvas-student-surface" as const;

export const CANONICAL_WHITEBOARD_ARCHITECTURE = {
  id: CANONICAL_WHITEBOARD_ARCHITECTURE_ID,
  label: "Legacy canvas student surface",
  status: "frozen-for-v2-pre-02-02",
  rationale:
    "This is the active classroom whiteboard path and the narrowest safe docking point until Phase 2 builds the real layered teacher/student renderer.",
  nextStep: "02-02 layered board primitives and renderer",
} as const;

export type CanonicalWhiteboardArchitecture = typeof CANONICAL_WHITEBOARD_ARCHITECTURE;
