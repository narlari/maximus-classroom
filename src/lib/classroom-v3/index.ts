export type {
  ClassroomPhase,
  ExpectedAnswerType,
  BoardShape,
  LessonProblem,
  LessonPlan,
  SessionEvent,
} from "./types";

export { generateLessonPlan } from "./lesson-generator";

export {
  renderProblemToBoard,
  clearTeacherLayer,
  clearStudentLayer,
} from "./board-renderer";
