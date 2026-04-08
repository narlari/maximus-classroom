import type { BoardPosition, BoardTarget, TutorAction } from "@/lib/classroom-v2/types";

export type TeacherBoardTextElement = {
  kind: "text";
  id: string;
  sourceActionIndex: number;
  textType: "problem" | "text";
  text: string;
  position: BoardPosition;
  width: number;
  height: number;
};

export type TeacherBoardHighlightElement = {
  kind: "highlight";
  id: string;
  sourceActionIndex: number;
  rect: BoardRect;
  color: string;
};

export type TeacherBoardArrowElement = {
  kind: "arrow";
  id: string;
  sourceActionIndex: number;
  from: BoardPosition;
  to: BoardPosition;
  label?: string;
};

export type TeacherBoardUnderlineElement = {
  kind: "underline";
  id: string;
  sourceActionIndex: number;
  line: BoardLine;
  color: string;
};

export type TeacherBoardStepBoxElement = {
  kind: "stepBox";
  id: string;
  sourceActionIndex: number;
  rect: BoardRect;
  label?: string;
};

export type TeacherBoardPrimitive =
  | TeacherBoardTextElement
  | TeacherBoardHighlightElement
  | TeacherBoardArrowElement
  | TeacherBoardUnderlineElement
  | TeacherBoardStepBoxElement;

export type TeacherBoardScene = {
  width: number;
  height: number;
  elements: TeacherBoardPrimitive[];
};

export type BoardRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BoardLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

const DEFAULT_BOARD_SIZE = {
  width: 960,
  height: 640,
} as const;

const DEFAULT_TEXT_POSITION: BoardPosition = { x: 96, y: 132 };
const DEFAULT_TEXT_COLOR = "#f8fafc";
const DEFAULT_HIGHLIGHT_COLOR = "#38bdf8";
const DEFAULT_UNDERLINE_COLOR = "#fbbf24";
const TEXT_FONT_SIZE = 40;
const TEXT_LINE_HEIGHT = 52;
const TEXT_CHAR_WIDTH = 22;
const UNDERLINE_OFFSET = 8;
const REGION_PADDING = 10;

export function buildTeacherBoardScene(actions: TutorAction[]): TeacherBoardScene {
  let elements: TeacherBoardPrimitive[] = [];

  actions.forEach((action, index) => {
    const actionId = `teacher-action-${index + 1}`;

    switch (action.type) {
      case "board.clearTeacherLayer":
        elements = [];
        break;
      case "board.writeProblem":
      case "board.writeText": {
        const position = action.position ?? getDefaultPosition(elements.length);
        elements.push({
          kind: "text",
          id: actionId,
          sourceActionIndex: index,
          textType: action.type === "board.writeProblem" ? "problem" : "text",
          text: action.text,
          position,
          width: estimateTextWidth(action.text),
          height: TEXT_LINE_HEIGHT,
        });
        break;
      }
      case "board.highlight": {
        const rect = resolveTargetRect(action.target, elements);

        if (rect) {
          elements.push({
            kind: "highlight",
            id: actionId,
            sourceActionIndex: index,
            rect,
            color: action.color ?? DEFAULT_HIGHLIGHT_COLOR,
          });
        }
        break;
      }
      case "board.arrow":
        elements.push({
          kind: "arrow",
          id: actionId,
          sourceActionIndex: index,
          from: action.from,
          to: action.to,
          label: action.label,
        });
        break;
      case "board.underline": {
        const line = resolveTargetUnderline(action.target, elements);

        if (line) {
          elements.push({
            kind: "underline",
            id: actionId,
            sourceActionIndex: index,
            line,
            color: action.color ?? DEFAULT_UNDERLINE_COLOR,
          });
        }
        break;
      }
      case "board.stepBox": {
        const rect = resolveTargetRect(action.target, elements);

        if (rect) {
          elements.push({
            kind: "stepBox",
            id: actionId,
            sourceActionIndex: index,
            rect,
            label: action.label,
          });
        }
        break;
      }
      case "speak":
      case "ask":
        break;
    }
  });

  return {
    ...DEFAULT_BOARD_SIZE,
    elements,
  };
}

function getDefaultPosition(elementCount: number): BoardPosition {
  return {
    x: DEFAULT_TEXT_POSITION.x,
    y: DEFAULT_TEXT_POSITION.y + elementCount * 74,
  };
}

function estimateTextWidth(text: string) {
  return Math.max(80, text.length * TEXT_CHAR_WIDTH);
}

function resolveTargetRect(target: BoardTarget, elements: TeacherBoardPrimitive[]): BoardRect | null {
  if (target.kind === "region") {
    return { ...target };
  }

  const element = elements.find((candidate) => candidate.id === target.elementId);

  if (!element) {
    return null;
  }

  if (element.kind === "text") {
    if (target.kind === "textRange") {
      const clampedStart = Math.max(0, Math.min(target.start, element.text.length));
      const clampedEnd = Math.max(clampedStart, Math.min(target.end, element.text.length));
      const slice = element.text.slice(clampedStart, clampedEnd) || element.text;
      const offsetX = clampedStart * TEXT_CHAR_WIDTH;

      return {
        x: element.position.x + offsetX - REGION_PADDING,
        y: element.position.y - REGION_PADDING,
        width: estimateTextWidth(slice) + REGION_PADDING * 2,
        height: element.height + REGION_PADDING * 2,
      };
    }

    return {
      x: element.position.x - REGION_PADDING,
      y: element.position.y - REGION_PADDING,
      width: element.width + REGION_PADDING * 2,
      height: element.height + REGION_PADDING * 2,
    };
  }

  if (element.kind === "highlight" || element.kind === "stepBox") {
    return element.rect;
  }

  if (element.kind === "underline") {
    return {
      x: Math.min(element.line.x1, element.line.x2),
      y: Math.min(element.line.y1, element.line.y2) - 8,
      width: Math.abs(element.line.x2 - element.line.x1),
      height: 16,
    };
  }

  return {
    x: Math.min(element.from.x, element.to.x),
    y: Math.min(element.from.y, element.to.y),
    width: Math.abs(element.to.x - element.from.x),
    height: Math.abs(element.to.y - element.from.y),
  };
}

function resolveTargetUnderline(target: BoardTarget, elements: TeacherBoardPrimitive[]): BoardLine | null {
  const rect = resolveTargetRect(target, elements);

  if (!rect) {
    return null;
  }

  return {
    x1: rect.x,
    y1: rect.y + rect.height + UNDERLINE_OFFSET,
    x2: rect.x + rect.width,
    y2: rect.y + rect.height + UNDERLINE_OFFSET,
  };
}

export function getTeacherElementColor(element: TeacherBoardPrimitive) {
  if (element.kind === "text") {
    return DEFAULT_TEXT_COLOR;
  }

  if (element.kind === "highlight") {
    return element.color;
  }

  if (element.kind === "underline") {
    return element.color;
  }

  return DEFAULT_TEXT_COLOR;
}
