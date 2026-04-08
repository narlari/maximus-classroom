import Anthropic from "@anthropic-ai/sdk";
import type { LessonPlan, LessonProblem, BoardShape } from "./types";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a math curriculum designer for elementary school. You create structured lesson plans with visual board layouts for a digital whiteboard tutor.

Each lesson has exactly 3 problems. For each problem, you must provide tldraw-compatible shape definitions that will be rendered on a whiteboard.

Shape rules:
- Every shape ID MUST start with "teacher-" prefix
- Every shape must have isLocked: true
- Shape types allowed: "geo", "arrow", "text"
- For "geo" shapes, valid props: geo (rectangle|ellipse|cloud|star|diamond|hexagon|octagon|rhombus|trapezoid|triangle|x-box|check-box|arrow-right|arrow-left|arrow-up|arrow-down), dash (solid|dashed|dotted|draw), w, h, fill (none|semi|solid), color (black|blue|green|red|orange|yellow|violet|light-blue|light-green|light-red|light-violet|grey), size (s|m|l|xl), font (sans|mono|serif|draw), align (start|middle|end), verticalAlign (start|middle|end), labelColor, richText (string content for the label)
- For "arrow" shapes, valid props: color, size, start ({x,y}), end ({x,y}), arrowheadEnd (arrow|none), arrowheadStart (arrow|none), richText (string label)
- richText values should be plain strings — they will be converted to tldraw richText format by the renderer
- Position shapes on a 600x400 canvas. Keep teacher content in the top half (y < 200) to leave room for student work below.

Output format: JSON matching the LessonPlan schema exactly.`;

function buildUserPrompt(topic: string, gradeLevel: number): string {
  return `Create a lesson plan for grade ${gradeLevel} on the topic: "${topic}"

Return a JSON object with this exact structure:
{
  "topic": "${topic}",
  "gradeLevel": ${gradeLevel},
  "problems": [
    {
      "problemId": "p1",
      "problemText": "human-readable problem text",
      "boardShapes": [
        {
          "shapeId": "teacher-p1-label",
          "type": "geo",
          "x": 40,
          "y": 20,
          "props": {
            "geo": "rectangle",
            "w": 520,
            "h": 44,
            "fill": "none",
            "color": "blue",
            "dash": "solid",
            "size": "s",
            "richText": "Solve this problem:",
            "font": "sans",
            "align": "middle",
            "verticalAlign": "middle",
            "labelColor": "blue"
          },
          "isLocked": true
        },
        {
          "shapeId": "teacher-p1-problem",
          "type": "geo",
          "x": 40,
          "y": 75,
          "props": {
            "geo": "rectangle",
            "w": 300,
            "h": 70,
            "fill": "semi",
            "color": "blue",
            "dash": "dashed",
            "size": "xl",
            "richText": "43 - 19 = ___",
            "font": "mono",
            "align": "middle",
            "verticalAlign": "middle",
            "labelColor": "black"
          },
          "isLocked": true
        }
      ],
      "spokenPrompt": "what the tutor says out loud to introduce this problem",
      "expectedAnswerType": "number",
      "hints": [
        "first hint if stuck",
        "second hint with more help",
        "third hint nearly giving it away"
      ]
    }
  ]
}

Generate exactly 3 problems. Each problem must have at least 2 board shapes (a label and the problem itself). Make problems progressively harder. Use age-appropriate language in spoken prompts.

Return ONLY the JSON object, no markdown fences or extra text.`;
}

function generateLessonId(): string {
  return `lesson-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function validateBoardShape(shape: BoardShape, problemId: string): BoardShape {
  // Ensure shape ID has teacher- prefix
  if (!shape.shapeId.startsWith("teacher-")) {
    shape.shapeId = `teacher-${shape.shapeId}`;
  }
  // Ensure isLocked
  shape.isLocked = true;
  return shape;
}

function validateProblem(problem: LessonProblem): LessonProblem {
  return {
    ...problem,
    boardShapes: problem.boardShapes.map((s) =>
      validateBoardShape(s, problem.problemId)
    ),
  };
}

export async function generateLessonPlan(input: {
  topic: string;
  gradeLevel: number;
}): Promise<LessonPlan> {
  const { topic, gradeLevel } = input;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserPrompt(topic, gradeLevel),
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(textBlock.text);
  } catch {
    // Try extracting JSON from markdown code fences
    const match = textBlock.text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      raw = JSON.parse(match[1]);
    } else {
      throw new Error("Failed to parse lesson plan JSON from response");
    }
  }

  const parsed = raw as {
    topic: string;
    gradeLevel: number;
    problems: LessonProblem[];
  };

  const lessonPlan: LessonPlan = {
    lessonId: generateLessonId(),
    topic: parsed.topic || topic,
    gradeLevel: parsed.gradeLevel || gradeLevel,
    problems: (parsed.problems || []).map(validateProblem),
  };

  if (lessonPlan.problems.length === 0) {
    throw new Error("Lesson plan has no problems");
  }

  return lessonPlan;
}
