export const WHITEBOARD_BACKGROUND = "#fffdf7";

export const WHITEBOARD_COLORS = [
  "#ff6b6b",
  "#ff9f1c",
  "#ffd93d",
  "#2ec4b6",
  "#4d96ff",
  "#9b5de5",
] as const;

export type WhiteboardVisualId = "number-line" | "fraction-circles" | "grid" | "basic-shapes";

type WhiteboardElementSkeleton = {
  type:
    | "ellipse"
    | "line"
    | "rectangle"
    | "text";
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: [number, number][];
  text?: string;
  strokeColor?: string;
  backgroundColor?: string;
  fillStyle?: "solid" | "hachure" | "cross-hatch";
  roughness?: number;
  strokeWidth?: number;
  fontSize?: number;
  opacity?: number;
};

export type WhiteboardVisualScene = {
  id: WhiteboardVisualId;
  label: string;
  elements: WhiteboardElementSkeleton[];
};

export function inferWhiteboardVisual(transcript: string): WhiteboardVisualId | null {
  const normalized = transcript.toLowerCase();

  if (!/(whiteboard|draw|show|look at|number line|fraction|grid|shape)/.test(normalized)) {
    return null;
  }

  if (/(fraction|pizza|slice|shaded|divided)/.test(normalized)) {
    return "fraction-circles";
  }

  if (/(number line|count on|jump forward|jump back|add on)/.test(normalized)) {
    return "number-line";
  }

  if (/(grid|array|rows|columns|graph paper)/.test(normalized)) {
    return "grid";
  }

  if (/(rectangle|circle|line|shape)/.test(normalized)) {
    return "basic-shapes";
  }

  return null;
}

export function buildWhiteboardVisual(id: WhiteboardVisualId): WhiteboardVisualScene {
  switch (id) {
    case "fraction-circles":
      return {
        id,
        label: "fraction circles",
        elements: [
          {
            type: "text",
            x: 80,
            y: 40,
            text: "Fractions",
            fontSize: 28,
            strokeColor: "#15324a",
          },
          {
            type: "ellipse",
            x: 80,
            y: 120,
            width: 180,
            height: 180,
            strokeColor: "#ff9f1c",
            strokeWidth: 3,
            roughness: 0,
          },
          {
            type: "line",
            x: 170,
            y: 120,
            points: [
              [0, 0],
              [0, 180],
            ],
            strokeColor: "#ff9f1c",
            strokeWidth: 3,
            roughness: 0,
          },
          {
            type: "line",
            x: 80,
            y: 210,
            points: [
              [0, 0],
              [180, 0],
            ],
            strokeColor: "#ff9f1c",
            strokeWidth: 3,
            roughness: 0,
          },
          {
            type: "ellipse",
            x: 320,
            y: 120,
            width: 180,
            height: 180,
            strokeColor: "#4d96ff",
            strokeWidth: 3,
            roughness: 0,
          },
          {
            type: "line",
            x: 410,
            y: 120,
            points: [
              [0, 0],
              [0, 180],
            ],
            strokeColor: "#4d96ff",
            strokeWidth: 3,
            roughness: 0,
          },
          {
            type: "text",
            x: 112,
            y: 320,
            text: "1/4",
            fontSize: 26,
            strokeColor: "#15324a",
          },
          {
            type: "text",
            x: 352,
            y: 320,
            text: "2/4",
            fontSize: 26,
            strokeColor: "#15324a",
          },
        ],
      };
    case "grid":
      return {
        id,
        label: "grid",
        elements: [
          {
            type: "text",
            x: 80,
            y: 40,
            text: "Grid",
            fontSize: 28,
            strokeColor: "#15324a",
          },
          ...Array.from({ length: 6 }, (_, index) => ({
            type: "line" as const,
            x: 100,
            y: 110 + index * 70,
            points: [
              [0, 0],
              [350, 0],
            ] as [number, number][],
            strokeColor: "#2ec4b6",
            strokeWidth: 2,
            roughness: 0,
          })),
          ...Array.from({ length: 6 }, (_, index) => ({
            type: "line" as const,
            x: 100 + index * 70,
            y: 110,
            points: [
              [0, 0],
              [0, 350],
            ] as [number, number][],
            strokeColor: "#2ec4b6",
            strokeWidth: 2,
            roughness: 0,
          })),
        ],
      };
    case "basic-shapes":
      return {
        id,
        label: "basic shapes",
        elements: [
          {
            type: "text",
            x: 80,
            y: 40,
            text: "Shapes",
            fontSize: 28,
            strokeColor: "#15324a",
          },
          {
            type: "ellipse",
            x: 90,
            y: 130,
            width: 160,
            height: 160,
            strokeColor: "#ff6b6b",
            strokeWidth: 4,
            roughness: 0,
          },
          {
            type: "rectangle",
            x: 320,
            y: 140,
            width: 210,
            height: 140,
            strokeColor: "#4d96ff",
            strokeWidth: 4,
            roughness: 0,
          },
          {
            type: "line",
            x: 110,
            y: 360,
            points: [
              [0, 0],
              [350, -20],
            ],
            strokeColor: "#9b5de5",
            strokeWidth: 4,
            roughness: 0,
          },
          {
            type: "text",
            x: 130,
            y: 304,
            text: "circle",
            fontSize: 22,
            strokeColor: "#15324a",
          },
          {
            type: "text",
            x: 382,
            y: 300,
            text: "rectangle",
            fontSize: 22,
            strokeColor: "#15324a",
          },
          {
            type: "text",
            x: 250,
            y: 388,
            text: "line",
            fontSize: 22,
            strokeColor: "#15324a",
          },
        ],
      };
    case "number-line":
    default:
      return {
        id: "number-line",
        label: "number line",
        elements: [
          {
            type: "text",
            x: 80,
            y: 40,
            text: "Number line",
            fontSize: 28,
            strokeColor: "#15324a",
          },
          {
            type: "line",
            x: 90,
            y: 220,
            points: [
              [0, 0],
              [560, 0],
            ],
            strokeColor: "#15324a",
            strokeWidth: 4,
            roughness: 0,
          },
          ...Array.from({ length: 11 }, (_, index) => ({
            type: "line" as const,
            x: 110 + index * 50,
            y: 192,
            points: [
              [0, 0],
              [0, 56],
            ] as [number, number][],
            strokeColor: "#15324a",
            strokeWidth: 2,
            roughness: 0,
          })),
          ...Array.from({ length: 11 }, (_, index) => ({
            type: "text" as const,
            x: 100 + index * 50,
            y: 260,
            text: String(index),
            fontSize: 20,
            strokeColor: "#15324a",
          })),
          {
            type: "line",
            x: 210,
            y: 180,
            points: [
              [0, 0],
              [150, 0],
            ],
            strokeColor: "#ff6b6b",
            strokeWidth: 6,
            roughness: 0,
          },
          {
            type: "line",
            x: 320,
            y: 168,
            points: [
              [0, 12],
              [40, 0],
              [0, -12],
            ],
            strokeColor: "#ff6b6b",
            strokeWidth: 6,
            roughness: 0,
          },
        ],
      };
  }
}
