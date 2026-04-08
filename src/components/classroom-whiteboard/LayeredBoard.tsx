"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  buildTeacherBoardScene,
  getTeacherElementColor,
  type TeacherBoardScene,
} from "@/lib/classroom-v2/board";
import type { StudentBoardSnapshot, StudentBoardStroke, TutorAction } from "@/lib/classroom-v2";

const STUDENT_COLORS = ["#ffffff", "#f97316", "#22c55e", "#38bdf8", "#f472b6"];

type BoardSubmitIntent = "submit" | "check";

type Props = {
  actions: TutorAction[];
  studentInputEnabled: boolean;
  title?: string;
  subtitle?: string;
  ownershipLabel?: string;
  surfaceFocusLabel?: string;
  surfaceFocusDetail?: string;
  emphasisTone?: "teacher" | "student" | "review" | "neutral";
  teacherRevealProgress?: number;
  activeRevealActionIndex?: number | null;
  teacherMotionEnabled?: boolean;
  teacherHoldActive?: boolean;
  teacherHoldStrength?: number;
  reviewHandoffActive?: boolean;
  reviewHandoffLabel?: string;
  reviewHandoffDetail?: string;
  reviewHandoffProgress?: number;
  lessonCloseActive?: boolean;
  lessonCloseLabel?: string;
  lessonCloseDetail?: string;
  lessonCloseProgress?: number;
  onStudentSubmit?: (payload: {
    intent: BoardSubmitIntent;
    snapshot: StudentBoardSnapshot;
    strokes: StudentBoardStroke[];
  }) => void;
};

export function LayeredBoard({
  actions,
  studentInputEnabled,
  title = "Layered board",
  subtitle,
  ownershipLabel,
  surfaceFocusLabel,
  surfaceFocusDetail,
  emphasisTone = "neutral",
  teacherRevealProgress = 100,
  activeRevealActionIndex = null,
  teacherMotionEnabled = false,
  teacherHoldActive = false,
  teacherHoldStrength = 0,
  reviewHandoffActive = false,
  reviewHandoffLabel = "Review handoff is idle",
  reviewHandoffDetail = "Teacher review cues appear here only during the submission-to-review bridge.",
  reviewHandoffProgress = 0,
  lessonCloseActive = false,
  lessonCloseLabel = "Lesson close is idle",
  lessonCloseDetail = "Final landing cues appear here only during the lesson-close beat.",
  lessonCloseProgress = 0,
  onStudentSubmit,
}: Props) {
  const scene = useMemo(() => buildTeacherBoardScene(actions), [actions]);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const studentCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokeIdRef = useRef(0);
  const [activeColor, setActiveColor] = useState(STUDENT_COLORS[0]);
  const [strokes, setStrokes] = useState<StudentBoardStroke[]>([]);

  const hasStudentInk = strokes.length > 0;

  useEffect(() => {
    const canvas = studentCanvasRef.current;
    const shell = boardRef.current;

    if (!canvas || !shell) {
      return;
    }

    const resize = () => {
      const rect = shell.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.floor(rect.width * 2));
      const nextHeight = Math.max(1, Math.floor(rect.height * 2));

      if (canvas.width === nextWidth && canvas.height === nextHeight) {
        return;
      }

      const snapshot = document.createElement("canvas");
      snapshot.width = canvas.width;
      snapshot.height = canvas.height;
      snapshot.getContext("2d")?.drawImage(canvas, 0, 0);

      canvas.width = nextWidth;
      canvas.height = nextHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return;
      }

      ctx.scale(2, 2);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (snapshot.width > 0 && snapshot.height > 0) {
        ctx.drawImage(snapshot, 0, 0, snapshot.width, snapshot.height, 0, 0, rect.width, rect.height);
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = studentCanvasRef.current;

    if (!canvas) {
      return;
    }

    let drawing = false;
    let activeStroke: StudentBoardStroke | null = null;

    const getPoint = (event: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();

      if ("touches" in event) {
        const touch = event.touches[0] ?? event.changedTouches[0];
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      }

      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const start = (event: MouseEvent | TouchEvent) => {
      if (!studentInputEnabled) {
        return;
      }

      event.preventDefault();
      drawing = true;
      const point = getPoint(event);
      activeStroke = {
        strokeId: `student-stroke-${++strokeIdRef.current}`,
        tool: "pen",
        color: activeColor,
        points: [point],
      };
      setStrokes((current) => [...current, activeStroke!]);
    };

    const move = (event: MouseEvent | TouchEvent) => {
      if (!drawing || !studentInputEnabled || !activeStroke) {
        return;
      }

      event.preventDefault();
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return;
      }

      const point = getPoint(event);
      const previousPoint = activeStroke.points[activeStroke.points.length - 1];
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(previousPoint.x, previousPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();

      activeStroke = {
        ...activeStroke,
        points: [...activeStroke.points, point],
      };
      setStrokes((current) => current.map((stroke) => (stroke.strokeId === activeStroke?.strokeId ? activeStroke : stroke)));
    };

    const end = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
      drawing = false;
      activeStroke = null;
    };

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mouseup", end);
    canvas.addEventListener("mouseleave", end);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end, { passive: false });

    return () => {
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", move);
      canvas.removeEventListener("mouseup", end);
      canvas.removeEventListener("mouseleave", end);
      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", move);
      canvas.removeEventListener("touchend", end);
    };
  }, [activeColor, studentInputEnabled]);

  const clearStudentLayer = () => {
    const canvas = studentCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    const rect = canvas?.getBoundingClientRect();

    if (!canvas || !ctx || !rect) {
      return;
    }

    ctx.clearRect(0, 0, rect.width, rect.height);
    setStrokes([]);
  };

  const emitStudentSubmission = (intent: BoardSubmitIntent) => {
    const canvas = studentCanvasRef.current;
    const rect = canvas?.getBoundingClientRect();

    if (!canvas || !rect || !hasStudentInk || !onStudentSubmit) {
      return;
    }

    onStudentSubmit({
      intent,
      snapshot: {
        dataUrl: canvas.toDataURL("image/png"),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        mimeType: "image/png",
        strokeCount: strokes.length,
      },
      strokes,
    });
  };

  const emphasisClass = getBoardEmphasisClass(emphasisTone, teacherHoldActive, teacherHoldStrength);

  return (
    <section className={`rounded-[28px] border p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)] ${emphasisClass.shell}`}>
      <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Canonical board surface</p>
            {ownershipLabel ? (
              <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${emphasisClass.chip}`}>
                {ownershipLabel}
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">
            {subtitle ?? "Teacher actions render deterministically to the teacher layer. Student ink stays isolated on its own layer."}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:w-[360px] xl:grid-cols-1">
          <div className={`rounded-2xl border p-4 ${emphasisClass.panel}`}>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Board focus now</p>
            <p className="mt-2 text-base font-semibold text-white">{surfaceFocusLabel ?? (studentInputEnabled ? "Student work area is active" : "Teacher board area is active")}</p>
            <p className="mt-2 text-sm text-white/68">
              {surfaceFocusDetail ?? (studentInputEnabled ? "The student layer is open for drawing and submitting work." : "The student layer is visually quiet so the teacher board reads as the lesson anchor.")}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0c1426]/85 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Board ownership</p>
            <div className="mt-3 grid gap-2">
              <div className={`rounded-2xl border px-3 py-3 text-sm ${studentInputEnabled ? "border-white/10 bg-white/5 text-white/50" : "border-electric/25 bg-electric/10 text-white"}`}>
                Teacher layer: problem, highlights, coaching layout
              </div>
              <div className={`rounded-2xl border px-3 py-3 text-sm ${studentInputEnabled ? "border-mint/25 bg-mint/10 text-white" : "border-white/10 bg-white/5 text-white/50"}`}>
                Student layer: draw, check, submit work
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={boardRef}
        className={`relative aspect-[3/2] overflow-hidden rounded-[24px] border bg-[#0f1b2f] transition-shadow duration-300 ${emphasisClass.boardFrame}`}
        style={getBoardFrameStyle(
          emphasisTone,
          teacherHoldActive,
          teacherHoldStrength,
          reviewHandoffActive,
          reviewHandoffProgress,
          lessonCloseActive,
          lessonCloseProgress,
        )}
      >
        <div className={`pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_48%)] ${emphasisClass.boardGlow}`} />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[linear-gradient(180deg,rgba(3,8,20,0.78),rgba(3,8,20,0.18))] px-4 py-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Lesson board</p>
            <p className="mt-1 text-sm font-semibold text-white">{studentInputEnabled ? "Student response area is open" : "Teacher-led board moment"}</p>
          </div>
          <div className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${studentInputEnabled ? "border-mint/25 bg-mint/10 text-mint" : "border-electric/25 bg-electric/10 text-electric"}`}>
            {studentInputEnabled ? "student-owned beat" : "teacher-owned beat"}
          </div>
        </div>
        {reviewHandoffActive ? (
          <div className="pointer-events-none absolute inset-x-6 top-[76px] z-20">
            <div className="rounded-2xl border border-violet-300/20 bg-[linear-gradient(180deg,rgba(76,29,149,0.24),rgba(30,41,59,0.7))] px-4 py-3 shadow-[0_18px_40px_rgba(76,29,149,0.18)] backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-violet-100/65">Teacher-review handoff</p>
                  <p className="mt-2 text-sm font-semibold text-white">{reviewHandoffLabel}</p>
                  <p className="mt-1 text-xs text-white/70">{reviewHandoffDetail}</p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/75">
                  {Math.round(reviewHandoffProgress * 100)}%
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,rgba(251,191,36,0.95),rgba(167,139,250,0.95))] transition-all duration-300"
                  style={{ width: `${Math.round(reviewHandoffProgress * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}
        {lessonCloseActive ? (
          <div className="pointer-events-none absolute inset-x-10 bottom-8 z-20">
            <div className="rounded-2xl border border-emerald-300/20 bg-[linear-gradient(180deg,rgba(6,95,70,0.24),rgba(15,23,42,0.76))] px-4 py-3 shadow-[0_20px_42px_rgba(6,95,70,0.22)] backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-100/65">Lesson close</p>
                  <p className="mt-2 text-sm font-semibold text-white">{lessonCloseLabel}</p>
                  <p className="mt-1 text-xs text-white/70">{lessonCloseDetail}</p>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/75">
                  {Math.round(lessonCloseProgress * 100)}%
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,rgba(45,212,191,0.92),rgba(167,243,208,0.96))] transition-all duration-500"
                  style={{ width: `${Math.round(lessonCloseProgress * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}
        <TeacherLayer
          scene={scene}
          revealProgress={teacherRevealProgress}
          activeRevealActionIndex={activeRevealActionIndex}
          motionEnabled={teacherMotionEnabled}
          holdActive={teacherHoldActive}
          holdStrength={teacherHoldStrength}
        />
        <div className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-300 ${studentInputEnabled ? "bg-[linear-gradient(180deg,rgba(6,11,22,0.04),rgba(6,11,22,0.14))]" : "bg-[linear-gradient(180deg,rgba(56,189,248,0.04),rgba(56,189,248,0.02))]"}`} />
        <canvas
          ref={studentCanvasRef}
          className={`absolute inset-0 z-30 h-full w-full touch-none ${studentInputEnabled ? "cursor-crosshair" : "cursor-not-allowed opacity-70"}`}
          style={{ touchAction: "none" }}
          aria-label="Student drawing layer"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
        <span className="text-xs uppercase tracking-[0.2em] text-white/45">Student tools</span>
        {STUDENT_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            disabled={!studentInputEnabled}
            onClick={() => setActiveColor(color)}
            className={`h-8 w-8 rounded-full border-[3px] transition ${activeColor === color ? "border-white scale-105" : "border-transparent"} ${!studentInputEnabled ? "cursor-not-allowed opacity-40" : ""}`}
            style={{ backgroundColor: color }}
            aria-label={`Use ${color} pen`}
          />
        ))}
        <span className="ml-auto text-[11px] uppercase tracking-[0.18em] text-white/45">
          {hasStudentInk ? `${strokes.length} stroke${strokes.length === 1 ? "" : "s"} captured` : "No student ink yet"}
        </span>
        <button
          type="button"
          disabled={!hasStudentInk}
          onClick={clearStudentLayer}
          className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${hasStudentInk ? "bg-softred text-white hover:bg-softred/90" : "cursor-not-allowed bg-white/8 text-white/35"}`}
        >
          Clear student layer
        </button>
        <button
          type="button"
          disabled={!studentInputEnabled || !hasStudentInk}
          onClick={() => emitStudentSubmission("check")}
          className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${studentInputEnabled && hasStudentInk ? "bg-white/10 text-white hover:bg-white/15" : "cursor-not-allowed bg-white/8 text-white/35"}`}
        >
          Check my work
        </button>
        <button
          type="button"
          disabled={!studentInputEnabled || !hasStudentInk}
          onClick={() => emitStudentSubmission("submit")}
          className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] ${studentInputEnabled && hasStudentInk ? "bg-electric/20 text-white hover:bg-electric/30" : "cursor-not-allowed bg-white/8 text-white/35"}`}
        >
          Submit work
        </button>
      </div>
    </section>
  );
}

function TeacherLayer({
  scene,
  revealProgress,
  activeRevealActionIndex,
  motionEnabled,
  holdActive,
  holdStrength,
}: {
  scene: TeacherBoardScene;
  revealProgress: number;
  activeRevealActionIndex: number | null;
  motionEnabled: boolean;
  holdActive: boolean;
  holdStrength: number;
}) {
  const revealState = useMemo(
    () =>
      createTeacherRevealState({
        scene,
        revealProgress,
        activeRevealActionIndex,
        motionEnabled,
        holdActive,
        holdStrength,
      }),
    [scene, revealProgress, activeRevealActionIndex, motionEnabled, holdActive, holdStrength],
  );

  return (
    <svg viewBox={`0 0 ${scene.width} ${scene.height}`} className="absolute inset-0 h-full w-full" aria-label="Teacher layer">
      <defs>
        <marker id="teacher-arrowhead" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto">
          <path d="M0,0 L12,6 L0,12 z" fill="#f8fafc" />
        </marker>
      </defs>

      <rect x="0" y="0" width={scene.width} height={scene.height} fill="#0f1b2f" />

      {scene.elements.map((element) => {
        const presentation = revealState.get(element.id);

        if (!presentation) {
          return null;
        }

        const commonStyle = presentation.style;

        switch (element.kind) {
          case "highlight":
            return (
              <rect
                key={element.id}
                x={element.rect.x}
                y={element.rect.y}
                width={element.rect.width}
                height={element.rect.height}
                rx="18"
                fill={element.color}
                fillOpacity={0.12 + presentation.progress * 0.12}
                stroke={element.color}
                strokeOpacity={0.42 + presentation.progress * 0.33}
                strokeWidth="3"
                style={commonStyle}
              />
            );
          case "stepBox":
            return (
              <g key={element.id} style={commonStyle}>
                <rect
                  x={element.rect.x}
                  y={element.rect.y}
                  width={element.rect.width}
                  height={element.rect.height}
                  rx="16"
                  fill="rgba(15, 23, 42, 0.35)"
                  stroke="#f8fafc"
                  strokeDasharray="10 8"
                  strokeWidth="3"
                />
                {element.label ? (
                  <text x={element.rect.x + 16} y={element.rect.y - 10} fill="#fbbf24" fontSize="24" fontWeight="700">
                    {element.label}
                  </text>
                ) : null}
              </g>
            );
          case "arrow":
            return (
              <g key={element.id} style={commonStyle}>
                <line
                  x1={element.from.x}
                  y1={element.from.y}
                  x2={element.to.x}
                  y2={element.to.y}
                  stroke="#f8fafc"
                  strokeWidth="4"
                  markerEnd="url(#teacher-arrowhead)"
                  pathLength={100}
                  strokeDasharray={100}
                  strokeDashoffset={100 - presentation.progress * 100}
                />
                {element.label ? (
                  <text x={(element.from.x + element.to.x) / 2} y={(element.from.y + element.to.y) / 2 - 10} fill="#f8fafc" fontSize="24" fontWeight="600" textAnchor="middle">
                    {element.label}
                  </text>
                ) : null}
              </g>
            );
          case "underline":
            return (
              <line
                key={element.id}
                x1={element.line.x1}
                y1={element.line.y1}
                x2={element.line.x2}
                y2={element.line.y2}
                stroke={element.color}
                strokeWidth="5"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={100}
                strokeDashoffset={100 - presentation.progress * 100}
                style={commonStyle}
              />
            );
          case "text":
            return (
              <text
                key={element.id}
                x={element.position.x}
                y={element.position.y}
                fill={getTeacherElementColor(element)}
                fontSize={element.textType === "problem" ? "42" : "34"}
                fontWeight={element.textType === "problem" ? "700" : "600"}
                style={commonStyle}
              >
                {element.text}
              </text>
            );
        }
      })}
    </svg>
  );
}

type TeacherRevealPresentation = {
  progress: number;
  style: CSSProperties;
};

function createTeacherRevealState({
  scene,
  revealProgress,
  activeRevealActionIndex,
  motionEnabled,
  holdActive,
  holdStrength,
}: {
  scene: TeacherBoardScene;
  revealProgress: number;
  activeRevealActionIndex: number | null;
  motionEnabled: boolean;
  holdActive: boolean;
  holdStrength: number;
}) {
  const actionCount = Math.max(1, new Set(scene.elements.map((element) => element.sourceActionIndex)).size);
  const revealFloat = motionEnabled ? clampUnit(revealProgress / 100) * actionCount : actionCount;
  const activeIndex = activeRevealActionIndex ?? null;
  const holdGlow = clampUnit(holdStrength);

  return new Map<string, TeacherRevealPresentation>(
    scene.elements.map((element) => {
      const progress = motionEnabled ? clampUnit(revealFloat - element.sourceActionIndex) : 1;
      const isActive = motionEnabled && activeIndex === element.sourceActionIndex && progress > 0 && progress < 1;
      const isSettled = holdActive && progress >= 0.98;
      const baseScale = isActive ? 0.985 + progress * 0.03 : 0.995 + progress * 0.005;
      const holdScale = isSettled ? 1 + holdGlow * 0.01 : baseScale;
      const translateY = isSettled ? 0 : (1 - progress) * (element.kind === "text" ? 12 : 8);
      const translateX = isSettled ? 0 : element.kind === "arrow" ? (1 - progress) * -8 : 0;
      const style: CSSProperties = {
        opacity: progress,
        transformOrigin: getTeacherElementTransformOrigin(element),
        transform: `translate(${translateX}px, ${translateY}px) scale(${holdScale})`,
        transition: motionEnabled
          ? 'opacity 240ms ease-out, transform 420ms cubic-bezier(0.22, 1, 0.36, 1), stroke-dashoffset 320ms ease-out, filter 420ms ease-out'
          : 'opacity 180ms ease-out, filter 320ms ease-out',
        filter: isActive
          ? 'drop-shadow(0 0 10px rgba(255,255,255,0.08))'
          : isSettled
            ? `drop-shadow(0 0 ${10 + holdGlow * 8}px rgba(56,189,248,${0.08 + holdGlow * 0.08}))`
            : 'none',
      };

      return [element.id, { progress, style }];
    }),
  );
}

function getTeacherElementTransformOrigin(element: TeacherBoardScene["elements"][number]) {
  switch (element.kind) {
    case "text":
      return `${element.position.x}px ${element.position.y}px`;
    case "highlight":
    case "stepBox":
      return `${element.rect.x + element.rect.width / 2}px ${element.rect.y + element.rect.height / 2}px`;
    case "arrow":
      return `${(element.from.x + element.to.x) / 2}px ${(element.from.y + element.to.y) / 2}px`;
    case "underline":
      return `${(element.line.x1 + element.line.x2) / 2}px ${(element.line.y1 + element.line.y2) / 2}px`;
  }
}

function clampUnit(value: number) {
  return Math.max(0, Math.min(1, value));
}

function getBoardFrameStyle(
  emphasisTone: "teacher" | "student" | "review" | "neutral",
  teacherHoldActive: boolean,
  teacherHoldStrength: number,
  reviewHandoffActive: boolean,
  reviewHandoffProgress: number,
  lessonCloseActive: boolean,
  lessonCloseProgress: number,
): CSSProperties | undefined {
  if (lessonCloseActive) {
    const closeGlow = 90 + Math.round(lessonCloseProgress * 24);
    const closeAlpha = 0.16 + lessonCloseProgress * 0.08;

    return {
      boxShadow: `0 0 0 1px rgba(110,231,183,0.08), 0 28px ${closeGlow}px rgba(5,150,105,${closeAlpha})`,
    };
  }

  if (reviewHandoffActive) {
    const handoffGlow = 88 + Math.round(reviewHandoffProgress * 22);
    const handoffAlpha = 0.16 + reviewHandoffProgress * 0.08;

    return {
      boxShadow: `0 0 0 1px rgba(167,139,250,0.08), 0 28px ${handoffGlow}px rgba(109,40,217,${handoffAlpha})`,
    };
  }

  if (!teacherHoldActive || (emphasisTone !== "teacher" && emphasisTone !== "review")) {
    return undefined;
  }

  const depth = 90 + Math.round(teacherHoldStrength * 18);
  const alpha = emphasisTone === "teacher" ? 0.16 + teacherHoldStrength * 0.05 : 0.16 + teacherHoldStrength * 0.05;
  const glow =
    emphasisTone === "teacher"
      ? `0 0 0 1px rgba(56,189,248,0.08), 0 28px ${depth}px rgba(8,145,178,${alpha})`
      : `0 0 0 1px rgba(167,139,250,0.08), 0 28px ${depth}px rgba(109,40,217,${alpha})`;

  return {
    boxShadow: glow,
  };
}

function getBoardEmphasisClass(
  emphasisTone: "teacher" | "student" | "review" | "neutral",
  teacherHoldActive: boolean,
  _teacherHoldStrength: number,
) {
  switch (emphasisTone) {
    case "teacher":
      return {
        shell: "border-electric/20 bg-[linear-gradient(180deg,rgba(8,16,31,1),rgba(8,16,31,0.96))]",
        chip: "border-electric/25 bg-electric/10 text-electric",
        panel: teacherHoldActive ? "border-electric/20 bg-electric/10" : "border-electric/15 bg-electric/5",
        boardFrame: "border-electric/25 shadow-[0_0_0_1px_rgba(56,189,248,0.08),0_28px_90px_rgba(8,145,178,0.16)]",
        boardGlow: teacherHoldActive ? "opacity-100 saturate-150" : "opacity-100",
      };
    case "student":
      return {
        shell: "border-mint/20 bg-[linear-gradient(180deg,rgba(8,16,31,1),rgba(8,16,31,0.96))]",
        chip: "border-mint/25 bg-mint/10 text-mint",
        panel: "border-mint/15 bg-mint/5",
        boardFrame: "border-mint/25 shadow-[0_0_0_1px_rgba(45,212,191,0.08),0_28px_90px_rgba(13,148,136,0.16)]",
        boardGlow: "opacity-90",
      };
    case "review":
      return {
        shell: "border-violet-400/20 bg-[linear-gradient(180deg,rgba(8,16,31,1),rgba(8,16,31,0.96))]",
        chip: "border-violet-300/25 bg-violet-400/10 text-violet-200",
        panel: teacherHoldActive ? "border-violet-300/20 bg-violet-400/10" : "border-violet-300/15 bg-violet-400/5",
        boardFrame: "border-violet-300/25 shadow-[0_0_0_1px_rgba(167,139,250,0.08),0_28px_90px_rgba(109,40,217,0.16)]",
        boardGlow: teacherHoldActive ? "opacity-100 saturate-150" : "opacity-95",
      };
    case "neutral":
      return {
        shell: "border-white/10 bg-[#08101f]",
        chip: "border-white/10 bg-white/5 text-white/75",
        panel: "border-white/10 bg-white/5",
        boardFrame: "border-white/10 shadow-[0_28px_90px_rgba(0,0,0,0.26)]",
        boardGlow: "opacity-70",
      };
  }
}
