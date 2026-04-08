export type ClassroomState =
  | "idle"
  | "tutor_rendering"
  | "tutor_speaking"
  | "student_answering"
  | "student_submitted"
  | "tutor_reviewing"
  | "ended";

export type TutorAction =
  | {
      type: "speak";
      text: string;
    }
  | {
      type: "ask";
      prompt: string;
    }
  | {
      type: "board.writeProblem";
      text: string;
      position?: BoardPosition;
    }
  | {
      type: "board.writeText";
      text: string;
      position?: BoardPosition;
    }
  | {
      type: "board.highlight";
      target: BoardTarget;
      color?: string;
    }
  | {
      type: "board.arrow";
      from: BoardPosition;
      to: BoardPosition;
      label?: string;
    }
  | {
      type: "board.underline";
      target: BoardTarget;
      color?: string;
    }
  | {
      type: "board.stepBox";
      target: BoardTarget;
      label?: string;
    }
  | {
      type: "board.clearTeacherLayer";
    };

export type BoardPosition = {
  x: number;
  y: number;
};

export type BoardTarget =
  | {
      kind: "element";
      elementId: string;
    }
  | {
      kind: "textRange";
      elementId: string;
      start: number;
      end: number;
    }
  | {
      kind: "region";
      x: number;
      y: number;
      width: number;
      height: number;
    };

export type StudentVoiceEvidence = {
  type: "voice";
  utteranceId: string;
  transcript: string;
  startedAt: string;
  endedAt: string;
  confidence?: number;
};

export type StudentBoardStroke = {
  strokeId: string;
  tool: "pen" | "highlighter" | "shape" | "text" | "eraser";
  points: BoardPosition[];
  color?: string;
  text?: string;
};

export type StudentBoardSnapshot = {
  capturedAt?: string;
  strokes?: StudentBoardStroke[];
  imageDataUrl?: string;
  dataUrl?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  strokeCount?: number;
};

export type StudentBoardEvidence = {
  type: "board";
  submissionId: string;
  capturedAt: string;
  strokes: StudentBoardStroke[];
  snapshot?: StudentBoardSnapshot;
};

export type StudentCombinedEvidence = {
  type: "both";
  voice: StudentVoiceEvidence;
  board: StudentBoardEvidence;
};

export type StudentEvidence =
  | StudentVoiceEvidence
  | StudentBoardEvidence
  | StudentCombinedEvidence;

export type TutorTurnPlan = {
  turnId: string;
  actions: TutorAction[];
  expectsStudentEvidence: boolean;
};

export type ClassroomSession = {
  state: ClassroomState;
  lessonId: string;
  activeTurn: TutorTurnPlan | null;
  lastCompletedTurnId: string | null;
  studentEvidence: StudentEvidence | null;
  endedReason: string | null;
};

export type ClassroomTransitionEvent =
  | {
      type: "classroom.startTutorTurn";
      turn: TutorTurnPlan;
    }
  | {
      type: "classroom.finishTutorRendering";
      nextState: "tutor_speaking" | "student_answering" | "ended";
    }
  | {
      type: "classroom.finishTutorSpeaking";
      nextState: "student_answering" | "ended";
    }
  | {
      type: "classroom.submitStudentEvidence";
      evidence: StudentEvidence;
    }
  | {
      type: "classroom.beginTutorReview";
    }
  | {
      type: "classroom.finishTutorReview";
      nextState: "tutor_rendering" | "ended";
      nextTurn?: TutorTurnPlan;
      reason?: string;
    }
  | {
      type: "classroom.endLesson";
      reason: string;
    };

export type ClassroomTransitionErrorCode =
  | "INVALID_STATE"
  | "INVALID_EVENT"
  | "INVALID_TURN"
  | "INVALID_TURN_OUTCOME"
  | "MISSING_STUDENT_EVIDENCE";

export type ClassroomTransitionError = {
  code: ClassroomTransitionErrorCode;
  message: string;
  state: ClassroomState;
  event: ClassroomTransitionEvent["type"];
};

export type ClassroomTransitionSuccess = {
  ok: true;
  session: ClassroomSession;
};

export type ClassroomTransitionFailure = {
  ok: false;
  error: ClassroomTransitionError;
};

export type ClassroomTransitionResult =
  | ClassroomTransitionSuccess
  | ClassroomTransitionFailure;

export type StudentInputAccess = {
  mic: boolean;
  board: boolean;
  submit: boolean;
};
