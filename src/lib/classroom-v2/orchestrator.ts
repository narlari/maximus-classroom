import {
  createClassroomSession,
  getAllowedEvents,
  getStudentInputAccess,
  transitionClassroom,
} from "@/lib/classroom-v2/transitions";
import type {
  ClassroomSession,
  ClassroomTransitionEvent,
  ClassroomTransitionFailure,
  StudentInputAccess,
  TutorTurnPlan,
} from "@/lib/classroom-v2/types";

export type ClassroomOrchestratorSnapshot = {
  session: ClassroomSession;
  state: ClassroomSession["state"];
  activeTurn: TutorTurnPlan | null;
  studentInput: StudentInputAccess;
  allowedNextEvents: ClassroomTransitionEvent["type"][];
};

export type ClassroomOrchestratorDispatchResult =
  | {
      ok: true;
      event: ClassroomTransitionEvent;
      previous: ClassroomOrchestratorSnapshot;
      current: ClassroomOrchestratorSnapshot;
    }
  | {
      ok: false;
      event: ClassroomTransitionEvent;
      previous: ClassroomOrchestratorSnapshot;
      error: ClassroomTransitionFailure["error"];
    };

export type ClassroomVoiceAdapter = {
  onTutorTurnReady?: (snapshot: ClassroomOrchestratorSnapshot) => void;
  onStateChanged?: (snapshot: ClassroomOrchestratorSnapshot, previous: ClassroomOrchestratorSnapshot) => void;
};

export type ClassroomBoardAdapter = {
  onTutorTurnReady?: (snapshot: ClassroomOrchestratorSnapshot) => void;
  onStudentInputAccessChanged?: (
    studentInput: StudentInputAccess,
    snapshot: ClassroomOrchestratorSnapshot,
    previous: ClassroomOrchestratorSnapshot,
  ) => void;
};

export type ClassroomLoggingAdapter = {
  onEventDispatched?: (result: ClassroomOrchestratorDispatchResult) => void;
};

export type ClassroomStudentInputAdapter = {
  onStudentInputAccessChanged?: (
    studentInput: StudentInputAccess,
    snapshot: ClassroomOrchestratorSnapshot,
    previous: ClassroomOrchestratorSnapshot,
  ) => void;
};

export type ClassroomOrchestratorAdapters = {
  voice?: ClassroomVoiceAdapter;
  board?: ClassroomBoardAdapter;
  logging?: ClassroomLoggingAdapter;
  studentInput?: ClassroomStudentInputAdapter;
};

export type CreateClassroomOrchestratorOptions = {
  lessonId: string;
  initialSession?: ClassroomSession;
  adapters?: ClassroomOrchestratorAdapters;
};

export class ClassroomOrchestrator {
  private session: ClassroomSession;
  private readonly adapters: ClassroomOrchestratorAdapters;

  constructor(options: CreateClassroomOrchestratorOptions) {
    this.session = options.initialSession ?? createClassroomSession(options.lessonId);
    this.adapters = options.adapters ?? {};
  }

  getSession() {
    return this.session;
  }

  getSnapshot(): ClassroomOrchestratorSnapshot {
    return createSnapshot(this.session);
  }

  dispatch(event: ClassroomTransitionEvent): ClassroomOrchestratorDispatchResult {
    const previous = this.getSnapshot();
    const result = transitionClassroom(this.session, event);

    if (!result.ok) {
      const dispatchResult: ClassroomOrchestratorDispatchResult = {
        ok: false,
        event,
        previous,
        error: result.error,
      };

      this.adapters.logging?.onEventDispatched?.(dispatchResult);
      return dispatchResult;
    }

    this.session = result.session;
    const current = this.getSnapshot();

    notifyAdapters(previous, current, this.adapters);

    const dispatchResult: ClassroomOrchestratorDispatchResult = {
      ok: true,
      event,
      previous,
      current,
    };

    this.adapters.logging?.onEventDispatched?.(dispatchResult);
    return dispatchResult;
  }
}

export function createClassroomOrchestrator(options: CreateClassroomOrchestratorOptions) {
  return new ClassroomOrchestrator(options);
}

function createSnapshot(session: ClassroomSession): ClassroomOrchestratorSnapshot {
  return {
    session,
    state: session.state,
    activeTurn: session.activeTurn,
    studentInput: getStudentInputAccess(session.state),
    allowedNextEvents: getAllowedEvents(session.state),
  };
}

function notifyAdapters(
  previous: ClassroomOrchestratorSnapshot,
  current: ClassroomOrchestratorSnapshot,
  adapters?: ClassroomOrchestratorAdapters,
) {
  if (!adapters) {
    return;
  }

  if (didActiveTurnChange(previous, current)) {
    adapters.voice?.onTutorTurnReady?.(current);
    adapters.board?.onTutorTurnReady?.(current);
  }

  if (previous.state !== current.state) {
    adapters.voice?.onStateChanged?.(current, previous);
  }

  if (didStudentInputChange(previous.studentInput, current.studentInput)) {
    adapters.board?.onStudentInputAccessChanged?.(current.studentInput, current, previous);
    adapters.studentInput?.onStudentInputAccessChanged?.(current.studentInput, current, previous);
  }
}

function didActiveTurnChange(
  previous: ClassroomOrchestratorSnapshot,
  current: ClassroomOrchestratorSnapshot,
) {
  return previous.activeTurn?.turnId !== current.activeTurn?.turnId;
}

function didStudentInputChange(previous: StudentInputAccess, current: StudentInputAccess) {
  return (
    previous.mic !== current.mic ||
    previous.board !== current.board ||
    previous.submit !== current.submit
  );
}
