import type { ClassroomOrchestratorSnapshot } from "@/lib/classroom-v2/orchestrator";
import type { ClassroomState } from "@/lib/classroom-v2/types";

export type ClassroomRealtimeStudentCaptureMode = "ignored" | "active" | "disconnected";

export type ClassroomRealtimeSessionPolicy = {
  classroomState: ClassroomState;
  micMuted: boolean;
  studentCapture: ClassroomRealtimeStudentCaptureMode;
  allowStudentInterruptions: boolean;
  reason: string;
};

export function getClassroomRealtimeSessionPolicy(
  snapshot: Pick<ClassroomOrchestratorSnapshot, "state" | "studentInput">,
): ClassroomRealtimeSessionPolicy {
  switch (snapshot.state) {
    case "student_answering":
      return {
        classroomState: snapshot.state,
        micMuted: !snapshot.studentInput.mic,
        studentCapture: "active",
        allowStudentInterruptions: false,
        reason: "student turn active; open live student voice capture",
      };
    case "ended":
      return {
        classroomState: snapshot.state,
        micMuted: true,
        studentCapture: "disconnected",
        allowStudentInterruptions: false,
        reason: "lesson ended; close student voice capture",
      };
    case "idle":
      return {
        classroomState: snapshot.state,
        micMuted: true,
        studentCapture: "ignored",
        allowStudentInterruptions: false,
        reason: "lesson idle; keep student voice capture closed until a V2 turn begins",
      };
    case "tutor_rendering":
    case "tutor_speaking":
    case "student_submitted":
    case "tutor_reviewing":
      return {
        classroomState: snapshot.state,
        micMuted: true,
        studentCapture: "ignored",
        allowStudentInterruptions: false,
        reason: "tutor-owned state; ignore student mic input until student_answering",
      };
  }
}
