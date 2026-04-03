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

  // Initialize canvas resolution ONCE on mount
  const canvasInitRef = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasInitRef.current) return;
    canvasInitRef.current = true;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(2, 2);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, []);

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
    <section className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,48,0.98),rgba(12,18,36,0.98))]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-muted">Whiteboard</p>
          <p className="mt-1 text-sm text-white/72">{boardStatus}</p>
        </div>
        {isAnalyzing && <span className="text-sm font-semibold text-electric animate-pulse">Checking...</span>}
      </div>

      <div className="relative flex-1 cursor-crosshair bg-[#f8fbff]" style={{ minHeight: "350px" }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          style={{ touchAction: "none" }}
        />
      </div>

      <div className="border-t border-white/10 bg-[#121a33] px-4 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Colors</span>
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setActiveColor(color)}
              className={`h-12 w-12 rounded-full border-4 transition ${
                activeColor === color ? "border-white scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}

          <span className="ml-3 text-xs font-bold uppercase tracking-[0.18em] text-muted">Size</span>
          <button onClick={() => setLineWidth(2)} className={`h-12 min-w-12 rounded-full border border-white/10 px-3 text-xs font-black ${lineWidth === 2 ? "bg-electric text-white" : "bg-white/5 text-white"}`}>S</button>
          <button onClick={() => setLineWidth(4)} className={`h-12 min-w-12 rounded-full border border-white/10 px-3 text-xs font-black ${lineWidth === 4 ? "bg-electric text-white" : "bg-white/5 text-white"}`}>M</button>
          <button onClick={() => setLineWidth(8)} className={`h-12 min-w-12 rounded-full border border-white/10 px-3 text-xs font-black ${lineWidth === 8 ? "bg-electric text-white" : "bg-white/5 text-white"}`}>L</button>

          <button
            type="button"
            onClick={handleClear}
            className="ml-auto min-h-12 rounded-full bg-softred px-5 text-sm font-black text-white transition hover:bg-softred/90"
          >
            🗑️ Clear
          </button>
        </div>
      </div>
    </section>
  );
}
