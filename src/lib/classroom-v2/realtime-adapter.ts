import type {
  ClassroomOrchestratorAdapters,
  ClassroomOrchestratorSnapshot,
} from "@/lib/classroom-v2/orchestrator";
import {
  getClassroomRealtimeSessionPolicy,
  type ClassroomRealtimeSessionPolicy,
} from "@/lib/classroom-v2/realtime-policy";
import type { SessionStatus } from "@/lib/realtime";
import type { TutorAction } from "@/lib/classroom-v2/types";

export type ClassroomRealtimeTransportCommand =
  | { type: "transport.connect"; studentId: string }
  | { type: "transport.disconnect" }
  | { type: "transport.applySessionPolicy"; policy: ClassroomRealtimeSessionPolicy }
  | { type: "transport.setMicMuted"; muted: boolean }
  | { type: "transport.speak"; text: string };

export type ClassroomRealtimeTransportSnapshot = {
  connected: boolean;
  status: SessionStatus;
  micMuted: boolean;
  appliedPolicy: ClassroomRealtimeSessionPolicy | null;
  spokenTexts: string[];
  commands: ClassroomRealtimeTransportCommand[];
};

export type ClassroomRealtimeTransport = {
  connect: () => Promise<void>;
  disconnect: () => void;
  speak: (text: string) => void;
  applySessionPolicy: (policy: ClassroomRealtimeSessionPolicy) => void;
  setMicMuted: (muted: boolean) => void;
  getSnapshot: () => ClassroomRealtimeTransportSnapshot;
};

export type CreateClassroomRealtimeOrchestrationAdapterOptions = {
  transport: ClassroomRealtimeTransport;
};

export type ClassroomRealtimeOrchestrationAdapter = {
  adapters: ClassroomOrchestratorAdapters;
  getTransportSnapshot: () => ClassroomRealtimeTransportSnapshot;
};

export function createClassroomRealtimeOrchestrationAdapter(
  options: CreateClassroomRealtimeOrchestrationAdapterOptions,
): ClassroomRealtimeOrchestrationAdapter {
  const { transport } = options;

  return {
    adapters: {
      voice: {
        onTutorTurnReady: (snapshot) => {
          syncTutorSpeech(transport, snapshot);
        },
        onStateChanged: (snapshot) => {
          applySnapshotPolicy(transport, snapshot);

          if (snapshot.state === "ended") {
            transport.disconnect();
          }
        },
      },
      studentInput: {
        onStudentInputAccessChanged: (_studentInput, snapshot) => {
          applySnapshotPolicy(transport, snapshot);
        },
      },
    },
    getTransportSnapshot: () => transport.getSnapshot(),
  };
}

export function createInMemoryClassroomRealtimeTransport(studentId: string): ClassroomRealtimeTransport {
  let connected = false;
  let status: SessionStatus = "idle";
  let micMuted = false;
  let appliedPolicy: ClassroomRealtimeSessionPolicy | null = null;
  const spokenTexts: string[] = [];
  const commands: ClassroomRealtimeTransportCommand[] = [];

  return {
    async connect() {
      connected = true;
      status = "listening";
      commands.push({ type: "transport.connect", studentId });
    },
    disconnect() {
      connected = false;
      status = "idle";
      commands.push({ type: "transport.disconnect" });
    },
    speak(text) {
      spokenTexts.push(text);
      status = "speaking";
      commands.push({ type: "transport.speak", text });
      status = connected ? "listening" : "idle";
    },
    applySessionPolicy(policy) {
      appliedPolicy = policy;
      micMuted = policy.micMuted;
      commands.push({ type: "transport.applySessionPolicy", policy });
      commands.push({ type: "transport.setMicMuted", muted: policy.micMuted });
    },
    setMicMuted(muted) {
      micMuted = muted;
      commands.push({ type: "transport.setMicMuted", muted });
    },
    getSnapshot() {
      return {
        connected,
        status,
        micMuted,
        appliedPolicy,
        spokenTexts: [...spokenTexts],
        commands: [...commands],
      };
    },
  };
}

function applySnapshotPolicy(
  transport: ClassroomRealtimeTransport,
  snapshot: ClassroomOrchestratorSnapshot,
) {
  transport.applySessionPolicy(getClassroomRealtimeSessionPolicy(snapshot));
}

function syncTutorSpeech(
  transport: ClassroomRealtimeTransport,
  snapshot: ClassroomOrchestratorSnapshot,
) {
  const speechTexts = getSpeechTexts(snapshot.activeTurn?.actions ?? []);

  if (speechTexts.length === 0) {
    return;
  }

  for (const text of speechTexts) {
    transport.speak(text);
  }
}

function getSpeechTexts(actions: TutorAction[]) {
  return actions.flatMap((action) => {
    if (action.type === "speak") {
      return [action.text];
    }

    if (action.type === "ask") {
      return [action.prompt];
    }

    return [];
  });
}
