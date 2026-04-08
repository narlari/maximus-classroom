import type { Editor, TLShapeId } from "tldraw";
import { createShapeId, toRichText } from "tldraw";
import type { LessonProblem, BoardShape } from "./types";

const TEACHER_PREFIX = "teacher-";

function teacherId(name: string): TLShapeId {
  return createShapeId(`${TEACHER_PREFIX}${name}`);
}

/** Remove all teacher shapes (IDs starting with "shape:teacher-") */
export function clearTeacherLayer(editor: Editor): void {
  const ids = editor
    .getCurrentPageShapes()
    .filter((s) => s.id.startsWith(`shape:${TEACHER_PREFIX}`))
    .map((s) => s.id);
  if (ids.length) {
    editor.run(() => editor.deleteShapes(ids), { history: "ignore" });
  }
}

/** Remove all student shapes (IDs NOT starting with "shape:teacher-") */
export function clearStudentLayer(editor: Editor): void {
  const ids = editor
    .getCurrentPageShapes()
    .filter((s) => !s.id.startsWith(`shape:${TEACHER_PREFIX}`))
    .map((s) => s.id);
  if (ids.length) {
    editor.run(() => editor.deleteShapes(ids), { history: "ignore" });
  }
}

function convertProps(
  shapeType: string,
  props: Record<string, unknown>
): Record<string, unknown> {
  const converted = { ...props };

  // Convert plain string richText to tldraw richText format
  if (typeof converted.richText === "string") {
    converted.richText = toRichText(converted.richText as string);
  }

  return converted;
}

/** Render a problem's board shapes onto the tldraw editor */
export function renderProblemToBoard(
  editor: Editor,
  problem: LessonProblem
): void {
  editor.run(
    () => {
      clearTeacherLayer(editor);

      for (const shape of problem.boardShapes) {
        const id = shape.shapeId.startsWith(TEACHER_PREFIX)
          ? createShapeId(shape.shapeId)
          : teacherId(shape.shapeId);

        editor.createShape({
          id,
          type: shape.type,
          x: shape.x,
          y: shape.y,
          props: convertProps(shape.type, shape.props),
          isLocked: true,
        });
      }
    },
    { history: "ignore" }
  );
}
