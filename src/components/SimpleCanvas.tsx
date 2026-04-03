"use client";

import { useRef, useState, useEffect, useCallback } from "react";

const COLORS = ["#1e1e1e", "#e03131", "#2f9e44", "#1971c2", "#f08c00", "#9c36b5"];

type Props = {
  sessionActive: boolean;
  tutorTranscript: string | null;
  onStudentDrawingDescription: (description: string) => void;
  onStudentActivity?: () => void;
};

export function SimpleCanvas({ sessionActive, tutorTranscript, onStudentDrawingDescription, onStudentActivity }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasShellRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const hasContentRef = useRef(false);
  const analyzeTimerRef = useRef<number | null>(null);
  const lastDescriptionRef = useRef("");
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [lineWidth, setLineWidth] = useState(3);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [boardStatus, setBoardStatus] = useState("Draw here!");
  const activeColorRef = useRef(activeColor);
  const lineWidthRef = useRef(lineWidth);

  useEffect(() => { activeColorRef.current = activeColor; }, [activeColor]);
  useEffect(() => { lineWidthRef.current = lineWidth; }, [lineWidth]);

  const getPos = useCallback((e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const scheduleAnalysis = useCallback(() => {
    if (!sessionActive || !hasContentRef.current) return;
    if (analyzeTimerRef.current) window.clearTimeout(analyzeTimerRef.current);
    analyzeTimerRef.current = window.setTimeout(async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      setIsAnalyzing(true);
      setBoardStatus("Maximus is looking at your work...");
      try {
        const dataUrl = canvas.toDataURL("image/png");
        const res = await fetch("/api/whiteboard/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageDataUrl: dataUrl }),
        });
        const data = await res.json();
        if (data.description && data.description !== lastDescriptionRef.current) {
          lastDescriptionRef.current = data.description;
          onStudentDrawingDescription(data.description);
          setBoardStatus(data.description);
        } else {
          setBoardStatus("Draw here!");
        }
      } catch {
        setBoardStatus("Draw here!");
      } finally {
        setIsAnalyzing(false);
      }
    }, 5000);
  }, [sessionActive, onStudentDrawingDescription]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
    if (ctx) {
      ctx.scale(2, 2);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (snapshot.width > 0 && snapshot.height > 0) {
        ctx.drawImage(snapshot, 0, 0, snapshot.width, snapshot.height, 0, 0, rect.width, rect.height);
      }
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    const shell = canvasShellRef.current;
    if (!shell) return;

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
    if (!canvas) return;

    const startDraw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDrawingRef.current = true;
      lastPosRef.current = getPos(e);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const pos = getPos(e);
      ctx.strokeStyle = activeColorRef.current;
      ctx.lineWidth = lineWidthRef.current;
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPosRef.current = pos;
      hasContentRef.current = true;
      onStudentActivity?.();
    };

    const endDraw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        scheduleAnalysis();
      }
    };

    // Mouse events
    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", endDraw);
    canvas.addEventListener("mouseleave", endDraw);

    // Touch events
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
  }, [getPos, scheduleAnalysis, onStudentActivity]);

  // When tutor speaks, check if they mention drawing and render visual aids
  const lastTutorTranscriptRef = useRef("");
  useEffect(() => {
    if (!tutorTranscript || tutorTranscript === lastTutorTranscriptRef.current) return;
    lastTutorTranscriptRef.current = tutorTranscript;

    const renderTutorVisual = async () => {
      try {
        const res = await fetch("/api/whiteboard/draw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: tutorTranscript }),
        });
        const data = await res.json();
        if (!data.label) return;

        // Draw the visual on the canvas
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        const cw = rect.width;
        const ch = rect.height;
        
        ctx.clearRect(0, 0, cw, ch);
        ctx.save();
        ctx.fillStyle = "#1971c2";
        ctx.font = "bold 18px system-ui, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`📐 ${data.label}`, 20, 30);
        
        const vid = data.id;
        if (vid === "number-line") {
          const y = ch / 2;
          const sx = 40, ex = cw - 40;
          ctx.strokeStyle = "#1e1e1e"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(ex, y); ctx.stroke();
          ctx.font = "bold 14px system-ui"; ctx.fillStyle = "#1e1e1e"; ctx.textAlign = "center";
          for (let i = 0; i <= 10; i++) {
            const x = sx + (ex - sx) * (i / 10);
            ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10); ctx.stroke();
            ctx.fillText(String(i), x, y + 28);
          }
        } else if (vid === "fraction-circles") {
          const cx1 = cw * 0.25, cx2 = cw * 0.75, cy = ch * 0.55, r = 60;
          ctx.strokeStyle = "#1e1e1e"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(cx1, cy, r, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx1, cy - r); ctx.lineTo(cx1, cy + r); ctx.stroke();
          ctx.fillStyle = "#ffd43b"; ctx.globalAlpha = 0.4;
          ctx.beginPath(); ctx.moveTo(cx1, cy); ctx.arc(cx1, cy, r, -Math.PI / 2, Math.PI / 2); ctx.fill();
          ctx.globalAlpha = 1; ctx.fillStyle = "#1e1e1e"; ctx.font = "bold 16px system-ui"; ctx.textAlign = "center";
          ctx.fillText("1/2", cx1, cy + r + 24);
          ctx.beginPath(); ctx.arc(cx2, cy, r, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx2 - r, cy); ctx.lineTo(cx2 + r, cy); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx2, cy - r); ctx.lineTo(cx2, cy + r); ctx.stroke();
          ctx.fillStyle = "#74c0fc"; ctx.globalAlpha = 0.4;
          ctx.beginPath(); ctx.moveTo(cx2, cy); ctx.arc(cx2, cy, r, -Math.PI / 2, 0); ctx.fill();
          ctx.globalAlpha = 1; ctx.fillStyle = "#1e1e1e";
          ctx.fillText("1/4", cx2, cy + r + 24);
        } else if (vid === "grid") {
          const gs = 24, gx = 40, gy = 50;
          ctx.strokeStyle = "#adb5bd"; ctx.lineWidth = 1;
          for (let i = 0; i <= 10; i++) {
            ctx.beginPath(); ctx.moveTo(gx + i * gs, gy); ctx.lineTo(gx + i * gs, gy + 10 * gs); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(gx, gy + i * gs); ctx.lineTo(gx + 10 * gs, gy + i * gs); ctx.stroke();
          }
        } else {
          ctx.fillStyle = "#1971c2"; ctx.font = "bold 24px system-ui"; ctx.textAlign = "center";
          ctx.fillText(data.label, cw / 2, ch / 2);
        }
        ctx.restore();

        hasContentRef.current = true;
        setBoardStatus(`Tutor drew: ${data.label}`);
      } catch {
        // Silent fail for tutor visuals
      }
    };

    void renderTutorVisual();
  }, [tutorTranscript]);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasContentRef.current = false;
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

          <button onClick={() => setLineWidth(2)} className={`h-9 min-w-9 rounded-full border border-white/10 px-3 text-[11px] font-black ${lineWidth === 2 ? "bg-electric text-white" : "bg-white/5 text-white"}`}>S</button>
          <button onClick={() => setLineWidth(4)} className={`h-9 min-w-9 rounded-full border border-white/10 px-3 text-[11px] font-black ${lineWidth === 4 ? "bg-electric text-white" : "bg-white/5 text-white"}`}>M</button>
          <button onClick={() => setLineWidth(8)} className={`h-9 min-w-9 rounded-full border border-white/10 px-3 text-[11px] font-black ${lineWidth === 8 ? "bg-electric text-white" : "bg-white/5 text-white"}`}>L</button>

          <button
            type="button"
            onClick={handleClear}
            className="ml-auto h-9 rounded-full bg-softred px-4 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-softred/90"
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
