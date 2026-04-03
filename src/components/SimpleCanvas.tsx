"use client";

import { useRef, useState, useEffect, useCallback } from "react";

const COLORS = ["#1e1e1e", "#e03131", "#2f9e44", "#1971c2", "#f08c00", "#9c36b5"];
const TUTOR_ZONE_HEIGHT = 80;
const TUTOR_PADDING_X = 18;
const TUTOR_PADDING_Y = 16;
const TUTOR_FONT = "bold 22px system-ui, sans-serif";
const TUTOR_LINE_HEIGHT = 24;
const MAX_TUTOR_LINES = 3;

type Props = {
  sessionActive: boolean;
  tutorTranscript: string | null;
  onStudentDrawingDescription: (description: string) => void;
  onStudentActivity?: () => void;
};

function normalizeTutorTranscript(transcript: string | null) {
  if (!transcript) {
    return "";
  }

  return transcript.includes("::") ? transcript.split("::").slice(1).join("::") : transcript;
}

function wrapTutorText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [];
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (ctx.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;

    if (lines.length === MAX_TUTOR_LINES - 1) {
      break;
    }
  }

  if (lines.length < MAX_TUTOR_LINES && currentLine) {
    lines.push(currentLine);
  }

  if (lines.length === MAX_TUTOR_LINES) {
    const lastLine = lines[MAX_TUTOR_LINES - 1] ?? "";

    if (ctx.measureText(lastLine).width > maxWidth) {
      let trimmed = lastLine;

      while (trimmed.length > 0 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
        trimmed = trimmed.slice(0, -1).trimEnd();
      }

      lines[MAX_TUTOR_LINES - 1] = trimmed ? `${trimmed}...` : "...";
    } else if (words.join(" ") !== lines.join(" ")) {
      let trimmed = lastLine;

      while (trimmed.length > 0 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
        trimmed = trimmed.slice(0, -1).trimEnd();
      }

      lines[MAX_TUTOR_LINES - 1] = trimmed ? `${trimmed}...` : "...";
    }
  }

  return lines;
}

export function SimpleCanvas({ sessionActive, tutorTranscript, onStudentDrawingDescription, onStudentActivity }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasShellRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const hasContentRef = useRef(false);
  const lastDescriptionRef = useRef("");
  const tutorMessageRef = useRef("");
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [lineWidth, setLineWidth] = useState(3);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [boardStatus, setBoardStatus] = useState("Draw here!");
  const activeColorRef = useRef(activeColor);
  const lineWidthRef = useRef(lineWidth);

  useEffect(() => {
    activeColorRef.current = activeColor;
  }, [activeColor]);

  useEffect(() => {
    lineWidthRef.current = lineWidth;
  }, [lineWidth]);

  const drawTutorZone = useCallback((ctx: CanvasRenderingContext2D, width: number, message?: string) => {
    const tutorMessage = message ?? tutorMessageRef.current;

    ctx.save();
    ctx.clearRect(0, 0, width, TUTOR_ZONE_HEIGHT);
    ctx.fillStyle = "#1c3f7a";
    ctx.fillRect(0, 0, width, TUTOR_ZONE_HEIGHT);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, TUTOR_ZONE_HEIGHT - 0.5);
    ctx.lineTo(width, TUTOR_ZONE_HEIGHT - 0.5);
    ctx.stroke();

    if (tutorMessage) {
      ctx.fillStyle = "#ffffff";
      ctx.font = TUTOR_FONT;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      const lines = wrapTutorText(ctx, tutorMessage, Math.max(80, width - TUTOR_PADDING_X * 2));
      lines.forEach((line, index) => {
        ctx.fillText(line, TUTOR_PADDING_X, TUTOR_PADDING_Y + index * TUTOR_LINE_HEIGHT);
      });
    }

    ctx.restore();
  }, []);

  const getPos = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }

    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.floor(rect.width * 2));
    const nextHeight = Math.max(1, Math.floor(rect.height * 2));

    if (canvas.width === nextWidth && canvas.height === nextHeight) {
      return;
    }

    const snapshot = document.createElement("canvas");
    snapshot.width = canvas.width;
    snapshot.height = canvas.height;
    const snapshotContext = snapshot.getContext("2d");

    if (snapshotContext && canvas.width > 0 && canvas.height > 0) {
      snapshotContext.drawImage(canvas, 0, 0);
    }

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

    drawTutorZone(ctx, rect.width);
  }, [drawTutorZone]);

  useEffect(() => {
    resizeCanvas();
    const shell = canvasShellRef.current;

    if (!shell) {
      return;
    }

    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });

    observer.observe(shell);

    return () => {
      observer.disconnect();
    };
  }, [resizeCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const startDraw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const pos = getPos(e);

      if (pos.y <= TUTOR_ZONE_HEIGHT) {
        isDrawingRef.current = false;
        return;
      }

      isDrawingRef.current = true;
      lastPosRef.current = pos;
      onStudentActivity?.();
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();

      if (!isDrawingRef.current) {
        return;
      }

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return;
      }

      const pos = getPos(e);
      const nextY = Math.max(TUTOR_ZONE_HEIGHT + 1, pos.y);
      const lastY = Math.max(TUTOR_ZONE_HEIGHT + 1, lastPosRef.current.y);

      ctx.strokeStyle = activeColorRef.current;
      ctx.lineWidth = lineWidthRef.current;
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastY);
      ctx.lineTo(pos.x, nextY);
      ctx.stroke();

      lastPosRef.current = { x: pos.x, y: nextY };
      hasContentRef.current = true;
      setHasDrawing(true);
      onStudentActivity?.();
    };

    const endDraw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDrawingRef.current = false;
    };

    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", endDraw);
    canvas.addEventListener("mouseleave", endDraw);
    canvas.addEventListener("touchstart", startDraw, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", endDraw, { passive: false });

    return () => {
      canvas.removeEventListener("mousedown", startDraw);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", endDraw);
      canvas.removeEventListener("mouseleave", endDraw);
      canvas.removeEventListener("touchstart", startDraw);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", endDraw);
    };
  }, [getPos, onStudentActivity]);

  useEffect(() => {
    const tutorMessage = normalizeTutorTranscript(tutorTranscript);
    tutorMessageRef.current = tutorMessage;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const rect = canvas?.getBoundingClientRect();

    if (!ctx || !rect) {
      return;
    }

    drawTutorZone(ctx, rect.width, tutorMessage);
  }, [drawTutorZone, tutorTranscript]);

  const getStudentDrawingDataUrl = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const output = document.createElement("canvas");
    output.width = Math.max(1, Math.floor(rect.width * 2));
    output.height = Math.max(1, Math.floor((rect.height - TUTOR_ZONE_HEIGHT) * 2));

    const outputContext = output.getContext("2d");

    if (!outputContext) {
      return null;
    }

    outputContext.drawImage(
      canvas,
      0,
      TUTOR_ZONE_HEIGHT * 2,
      canvas.width,
      Math.max(1, canvas.height - TUTOR_ZONE_HEIGHT * 2),
      0,
      0,
      output.width,
      output.height,
    );

    return output.toDataURL("image/png");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!sessionActive || !hasContentRef.current) {
      return;
    }

    const imageDataUrl = getStudentDrawingDataUrl();

    if (!imageDataUrl) {
      return;
    }

    setIsAnalyzing(true);
    setBoardStatus("Maximus is looking at your work...");

    try {
      const res = await fetch("/api/whiteboard/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl }),
      });
      const data = await res.json();

      if (data.description && data.description !== lastDescriptionRef.current) {
        lastDescriptionRef.current = data.description;
        onStudentDrawingDescription(data.description);
        setBoardStatus(data.description);
        return;
      }

      setBoardStatus("No new drawing update yet.");
    } catch {
      setBoardStatus("Could not check the drawing right now.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [getStudentDrawingDataUrl, onStudentDrawingDescription, sessionActive]);

  const handleClear = () => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();

    if (!ctx) {
      return;
    }

    ctx.clearRect(0, TUTOR_ZONE_HEIGHT, rect.width, Math.max(0, rect.height - TUTOR_ZONE_HEIGHT));
    drawTutorZone(ctx, rect.width);
    hasContentRef.current = false;
    setHasDrawing(false);
    lastDescriptionRef.current = "";
    setBoardStatus("Draw here!");
  };

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#0a1020]">
      <div ref={canvasShellRef} className="relative flex-1 cursor-crosshair bg-[#f8fbff]">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          style={{ touchAction: "none" }}
        />
      </div>

      <div className="border-t border-white/10 bg-[#0f172a] px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setActiveColor(color)}
              aria-label={`Use ${color} pen`}
              className={`h-9 w-9 rounded-full border-[3px] transition ${
                activeColor === color ? "scale-105 border-white" : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}

          <button
            type="button"
            onClick={() => setLineWidth(2)}
            className={`h-9 min-w-9 rounded-full border border-white/10 px-3 text-[11px] font-black ${
              lineWidth === 2 ? "bg-electric text-white" : "bg-white/5 text-white"
            }`}
          >
            S
          </button>
          <button
            type="button"
            onClick={() => setLineWidth(4)}
            className={`h-9 min-w-9 rounded-full border border-white/10 px-3 text-[11px] font-black ${
              lineWidth === 4 ? "bg-electric text-white" : "bg-white/5 text-white"
            }`}
          >
            M
          </button>
          <button
            type="button"
            onClick={() => setLineWidth(8)}
            className={`h-9 min-w-9 rounded-full border border-white/10 px-3 text-[11px] font-black ${
              lineWidth === 8 ? "bg-electric text-white" : "bg-white/5 text-white"
            }`}
          >
            L
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!sessionActive || isAnalyzing || !hasDrawing}
            className={`ml-auto min-h-11 rounded-full px-5 text-sm font-black uppercase tracking-[0.12em] text-white transition ${
              !sessionActive || isAnalyzing || !hasDrawing
                ? "cursor-not-allowed bg-emerald-500/50"
                : "bg-emerald-500 hover:bg-emerald-400"
            }`}
          >
            {isAnalyzing ? "Checking..." : "✅ Submit"}
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="h-9 rounded-full bg-softred px-4 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-softred/90"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="sr-only" aria-live="polite">
        {isAnalyzing ? "Maximus is looking at your work." : boardStatus}
      </div>
    </section>
  );
}
