import type {
  ClassroomSession,
  ClassroomState,
  ClassroomTransitionError,
  ClassroomTransitionEvent,
  ClassroomTransitionResult,
  StudentInputAccess,
  TutorAction,
  TutorTurnPlan,
} from "@/lib/classroom-v2/types";

export function createClassroomSession(lessonId: string): ClassroomSession {
  return {
    state: "idle",
    lessonId,
    activeTurn: null,
    lastCompletedTurnId: null,
    studentEvidence: null,
    endedReason: null,
  };
}

export function transitionClassroom(
  session: ClassroomSession,
  event: ClassroomTransitionEvent,
): ClassroomTransitionResult {
  switch (event.type) {
    case "classroom.startTutorTurn":
      return startTutorTurn(session, event);
    case "classroom.finishTutorRendering":
      return finishTutorRendering(session, event);
    case "classroom.finishTutorSpeaking":
      return finishTutorSpeaking(session, event);
    case "classroom.submitStudentEvidence":
      return submitStudentEvidence(session, event);
    case "classroom.beginTutorReview":
      return beginTutorReview(session, event);
    case "classroom.finishTutorReview":
      return finishTutorReview(session, event);
    case "classroom.endLesson":
      return succeed({
        ...session,
        state: "ended",
        activeTurn: null,
        endedReason: event.reason,
      });
  }
}

export function getStudentInputAccess(state: ClassroomState): StudentInputAccess {
  return {
    mic: state === "student_answering",
    board: state === "student_answering",
    submit: state === "student_answering",
  };
}

export function canStudentUseMic(state: ClassroomState) {
  return getStudentInputAccess(state).mic;
}

export function canStudentUseBoard(state: ClassroomState) {
  return getStudentInputAccess(state).board;
}

export function canStudentSubmit(state: ClassroomState) {
  return getStudentInputAccess(state).submit;
}

export function getAllowedEvents(state: ClassroomState): ClassroomTransitionEvent["type"][] {
  switch (state) {
    case "idle":
      return ["classroom.startTutorTurn", "classroom.endLesson"];
    case "tutor_rendering":
      return ["classroom.finishTutorRendering", "classroom.endLesson"];
    case "tutor_speaking":
      return ["classroom.finishTutorSpeaking", "classroom.endLesson"];
    case "student_answering":
      return ["classroom.submitStudentEvidence", "classroom.endLesson"];
    case "student_submitted":
      return ["classroom.beginTutorReview", "classroom.endLesson"];
    case "tutor_reviewing":
      return ["classroom.finishTutorReview", "classroom.endLesson"];
    case "ended":
      return [];
    default:
      return [];
  }
}

function startTutorTurn(
  session: ClassroomSession,
  event: Extract<ClassroomTransitionEvent, { type: "classroom.startTutorTurn" }>,
): ClassroomTransitionResult {
  if (session.state !== "idle") {
    return fail(
      session.state,
      event.type,
      "INVALID_STATE",
      "Tutor turns can only start from idle.",
    );
  }

  if (event.turn.actions.length === 0) {
    return fail(session.state, event.type, "INVALID_TURN", "Tutor turn plans must include at least one action.");
  }

  return succeed({
    ...session,
    state: "tutor_rendering",
    activeTurn: event.turn,
    studentEvidence: null,
    endedReason: null,
  });
}

function finishTutorRendering(
  session: ClassroomSession,
  event: Extract<ClassroomTransitionEvent, { type: "classroom.finishTutorRendering" }>,
): ClassroomTransitionResult {
  if (session.state !== "tutor_rendering") {
    return fail(
      session.state,
      event.type,
      "INVALID_STATE",
      "Tutor rendering can only finish while the classroom is tutor_rendering.",
    );
  }

  if (!session.activeTurn) {
    return fail(session.state, event.type, "INVALID_TURN", "Tutor rendering requires an active tutor turn.");
  }

  if (!isValidRenderingOutcome(session.activeTurn, event.nextState)) {
    return fail(
      session.state,
      event.type,
      "INVALID_TURN_OUTCOME",
      "The selected post-render state does not match the active tutor turn.",
    );
  }

  return succeed({
    ...session,
    state: event.nextState,
    ...(event.nextState === "ended" ? { activeTurn: null, endedReason: session.endedReason ?? "completed" } : {}),
  });
}

function finishTutorSpeaking(
  session: ClassroomSession,
  event: Extract<ClassroomTransitionEvent, { type: "classroom.finishTutorSpeaking" }>,
): ClassroomTransitionResult {
  if (session.state !== "tutor_speaking") {
    return fail(
      session.state,
      event.type,
      "INVALID_STATE",
      "Tutor speaking can only finish while the classroom is tutor_speaking.",
    );
  }

  if (!session.activeTurn) {
    return fail(session.state, event.type, "INVALID_TURN", "Tutor speaking requires an active tutor turn.");
  }

  if (!isValidSpeakingOutcome(session.activeTurn, event.nextState)) {
    return fail(
      session.state,
      event.type,
      "INVALID_TURN_OUTCOME",
      "The selected post-speech state does not match the active tutor turn.",
    );
  }

  return succeed({
    ...session,
    state: event.nextState,
    ...(event.nextState === "ended"
      ? {
          lastCompletedTurnId: session.activeTurn.turnId,
          activeTurn: null,
        }
      : {}),
    ...(event.nextState === "ended" ? { endedReason: session.endedReason ?? "completed" } : {}),
  });
}

function submitStudentEvidence(
  session: ClassroomSession,
  event: Extract<ClassroomTransitionEvent, { type: "classroom.submitStudentEvidence" }>,
): ClassroomTransitionResult {
  if (session.state !== "student_answering") {
    return fail(
      session.state,
      event.type,
      "INVALID_STATE",
      "Student evidence can only be submitted while the classroom is student_answering.",
    );
  }

  return succeed({
    ...session,
    state: "student_submitted",
    studentEvidence: event.evidence,
  });
}

function beginTutorReview(
  session: ClassroomSession,
  event: Extract<ClassroomTransitionEvent, { type: "classroom.beginTutorReview" }>,
): ClassroomTransitionResult {
  if (session.state !== "student_submitted") {
    return fail(
      session.state,
      event.type,
      "INVALID_STATE",
      "Tutor review can only begin after student evidence has been submitted.",
    );
  }

  if (!session.studentEvidence) {
    return fail(
      session.state,
      event.type,
      "MISSING_STUDENT_EVIDENCE",
      "Tutor review requires submitted student evidence.",
    );
  }

  return succeed({
    ...session,
    state: "tutor_reviewing",
  });
}

function finishTutorReview(
  session: ClassroomSession,
  event: Extract<ClassroomTransitionEvent, { type: "classroom.finishTutorReview" }>,
): ClassroomTransitionResult {
  if (session.state !== "tutor_reviewing") {
    return fail(
      session.state,
      event.type,
      "INVALID_STATE",
      "Tutor review can only finish while the classroom is tutor_reviewing.",
    );
  }

  if (!session.studentEvidence) {
    return fail(
      session.state,
      event.type,
      "MISSING_STUDENT_EVIDENCE",
      "Tutor review cannot finish without retained student evidence.",
    );
  }

  if (event.nextState === "tutor_rendering") {
    if (!event.nextTurn || event.nextTurn.actions.length === 0) {
      return fail(
        session.state,
        event.type,
        "INVALID_TURN",
        "Tutor review must provide the next tutor turn before returning to tutor_rendering.",
      );
    }

    return succeed({
      ...session,
      state: "tutor_rendering",
      lastCompletedTurnId: session.activeTurn?.turnId ?? session.lastCompletedTurnId,
      activeTurn: event.nextTurn,
      studentEvidence: null,
      endedReason: null,
    });
  }

  return succeed({
    ...session,
    state: "ended",
    lastCompletedTurnId: session.activeTurn?.turnId ?? session.lastCompletedTurnId,
    activeTurn: null,
    endedReason: event.reason ?? session.endedReason ?? "completed",
  });
}

function isValidRenderingOutcome(
  turn: TutorTurnPlan,
  nextState: Extract<ClassroomState, "tutor_speaking" | "student_answering" | "ended">,
) {
  const hasSpeech = turn.actions.some(isSpeechAction);

  if (hasSpeech) {
    return nextState === "tutor_speaking" || nextState === "ended";
  }

  if (turn.expectsStudentEvidence) {
    return nextState === "student_answering" || nextState === "ended";
  }

  return nextState === "ended";
}

function isValidSpeakingOutcome(
  turn: TutorTurnPlan,
  nextState: Extract<ClassroomState, "student_answering" | "ended">,
) {
  if (turn.expectsStudentEvidence) {
    return nextState === "student_answering" || nextState === "ended";
  }

  return nextState === "ended";
}

function isSpeechAction(action: TutorAction) {
  return action.type === "speak" || action.type === "ask";
}

function succeed(session: ClassroomSession): ClassroomTransitionResult {
  return {
    ok: true,
    session,
  };
}

function fail(
  state: ClassroomState,
  event: ClassroomTransitionEvent["type"],
  code: ClassroomTransitionError["code"],
  message: string,
): ClassroomTransitionResult {
  return {
    ok: false,
    error: {
      code,
      message,
      state,
      event,
    },
  };
}
