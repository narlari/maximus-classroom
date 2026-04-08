"use client";

/**
 * WHITEBOARD SPIKE — tldraw v4 feasibility test
 *
 * Tests:
 * 1. Renders in Next.js (no SSR crash)
 * 2. Programmatic teacher drawing (geo + richText + arrows)
 * 3. Child freehand on top
 * 4. Teacher shapes locked
 * 5. PNG export
 * 6. Student layer clear independent of teacher
 */

import { useCallback, useRef } from "react";
import { Editor, TLShapeId, Tldraw, createShapeId, toRichText } from "tldraw";
import "tldraw/tldraw.css";

const T = "teacher-";

const tid = (name: string): TLShapeId => createShapeId(`${T}${name}`);

function clearTeacher(editor: Editor) {
  const ids = editor
    .getCurrentPageShapes()
    .filter((s) => s.id.startsWith(`shape:${T}`))
    .map((s) => s.id);
  if (ids.length) editor.run(() => editor.deleteShapes(ids), { history: "ignore" });
}

function drawProblem(editor: Editor, problem: string) {
  editor.run(() => {
    clearTeacher(editor);

    editor.createShape({
      id: tid("label"),
      type: "geo",
      x: 40, y: 20,
      props: {
        geo: "rectangle", w: 520, h: 44,
        fill: "none", color: "blue", dash: "solid", size: "s",
        richText: toRichText("Maximus: Solve this and show your work below 👇"),
        font: "sans", align: "middle", verticalAlign: "middle",
        labelColor: "blue",
      },
      isLocked: true,
    });

    editor.createShape({
      id: tid("problem"),
      type: "geo",
      x: 40, y: 75,
      props: {
        geo: "rectangle", w: 300, h: 70,
        fill: "semi", color: "blue", dash: "dashed", size: "xl",
        richText: toRichText(problem),
        font: "mono", align: "middle", verticalAlign: "middle",
        labelColor: "black",
      },
      isLocked: true,
    });
  }, { history: "ignore" });
}

function drawCorrection(editor: Editor) {
  editor.run(() => {
    editor.createShape({
      id: tid("step1"),
      type: "geo",
      x: 40, y: 210,
      props: {
        geo: "rectangle", w: 320, h: 50,
        fill: "semi", color: "orange", dash: "solid", size: "m",
        richText: toRichText("Step 1: Regroup → 13 − 9 = 4"),
        font: "mono", align: "middle", verticalAlign: "middle",
        labelColor: "black",
      },
      isLocked: true,
    });

    editor.createShape({
      id: tid("step2"),
      type: "geo",
      x: 40, y: 275,
      props: {
        geo: "rectangle", w: 320, h: 50,
        fill: "semi", color: "green", dash: "solid", size: "m",
        richText: toRichText("Step 2: 3 − 1 = 2 tens → Answer: 24"),
        font: "mono", align: "middle", verticalAlign: "middle",
        labelColor: "black",
      },
      isLocked: true,
    });

    editor.createShape({
      id: tid("arrow"),
      type: "arrow",
      x: 210, y: 145,
      props: {
        color: "red", size: "m",
        start: { x: 0, y: 0 },
        end: { x: 0, y: 58 },
        arrowheadEnd: "arrow", arrowheadStart: "none",
        richText: toRichText("here's why"),
      },
      isLocked: true,
    });
  }, { history: "ignore" });
}

export function TldrawSpike() {
  const editorRef = useRef<Editor | null>(null);

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
    drawProblem(editor, "43 − 19 = ___");
  }, []);

  const clearStudent = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const ids = editor
      .getCurrentPageShapes()
      .filter((s) => !s.id.startsWith(`shape:${T}`))
      .map((s) => s.id);
    if (ids.length) editor.deleteShapes(ids);
  };

  const exportSnap = async () => {
    const editor = editorRef.current;
    if (!editor) return;
    const ids = editor.getCurrentPageShapes().map((s) => s.id);
    try {
      const { blob } = await editor.toImage(ids, { format: "png", scale: 1, background: true });
      alert(`✅ Export OK — ${blob?.size} bytes`);
    } catch (e) {
      alert(`❌ Export failed: ${e}`);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gray-950 text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/50">tldraw v4 Spike</p>
          <h1 className="text-lg font-semibold">Whiteboard Feasibility</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => editorRef.current && drawProblem(editorRef.current, "43 − 19 = ___")} label="Draw problem" c="blue" />
          <Btn onClick={() => editorRef.current && drawCorrection(editorRef.current)} label="Draw correction" c="orange" />
          <Btn onClick={clearStudent} label="Clear student work" c="red" />
          <Btn onClick={exportSnap} label="Export PNG" c="green" />
          <Btn onClick={() => { const e = editorRef.current; if (e) { clearTeacher(e); clearStudent(); drawProblem(e, "43 − 19 = ___"); } }} label="Reset" c="gray" />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <Tldraw onMount={handleMount} />
      </div>
      <div className="border-t border-white/10 px-4 py-2 text-xs text-white/40">
        Tests: programmatic draw · locked teacher shapes · child freehand · layer sep · PNG export
      </div>
    </div>
  );
}

function Btn({ onClick, label, c }: { onClick: () => void; label: string; c: string }) {
  const cls: Record<string, string> = {
    blue: "bg-blue-600 hover:bg-blue-500",
    orange: "bg-orange-600 hover:bg-orange-500",
    red: "bg-red-700 hover:bg-red-600",
    green: "bg-emerald-700 hover:bg-emerald-600",
    gray: "bg-white/10 hover:bg-white/20",
  };
  return (
    <button type="button" onClick={onClick} className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white transition ${cls[c] ?? cls.gray}`}>
      {label}
    </button>
  );
}
