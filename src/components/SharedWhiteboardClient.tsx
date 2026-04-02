"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  convertToExcalidrawElements,
  exportToBlob,
  hashElementsVersion,
} from "@excalidraw/excalidraw";
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import {
  WHITEBOARD_BACKGROUND,
  WHITEBOARD_COLORS,
  type WhiteboardVisualId,
} from "@/lib/whiteboard";

const Excalidraw = dynamic(
  async () => {
    const module = await import("@excalidraw/excalidraw");
    return module.Excalidraw;
  },
  { ssr: false },
);

type WhiteboardTool = "freedraw" | "eraser" | "ellipse" | "rectangle" | "line";

type SceneSnapshot = {
  elements: readonly ExcalidrawElement[];
};

type DrawResponse = {
  id?: WhiteboardVisualId;
  label?: string;
  elements?: Parameters<typeof convertToExcalidrawElements>[0];
};

type AnalyzeResponse = {
  description?: string | null;
};

type Props = {
  sessionActive: boolean;
  tutorTranscript: string | null;
  onStudentDrawingDescription: (description: string) => void;
  onStudentActivity?: () => void;
};

const TOOL_OPTIONS: Array<{ id: WhiteboardTool; label: string; icon: string }> = [
  { id: "freedraw", label: "Pen", icon: "P" },
  { id: "eraser", label: "Erase", icon: "E" },
  { id: "ellipse", label: "Circle", icon: "C" },
  { id: "rectangle", label: "Box", icon: "B" },
  { id: "line", label: "Line", icon: "L" },
];

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read whiteboard snapshot."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read whiteboard snapshot."));
    reader.readAsDataURL(blob);
  });
}

export function SharedWhiteboardClient({
  sessionActive,
  tutorTranscript,
  onStudentDrawingDescription,
  onStudentActivity,
}: Props) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const historyRef = useRef<SceneSnapshot[]>([{ elements: [] }]);
  const lastSceneHashRef = useRef(0);
  const lastAnalyzedHashRef = useRef(0);
  const lastProgrammaticHashRef = useRef(0);
  const lastDescriptionRef = useRef("");
  const lastTutorTranscriptRef = useRef("");
  const analysisTimerRef = useRef<number | null>(null);
  const skipHistoryRef = useRef(false);
  const [activeTool, setActiveTool] = useState<WhiteboardTool>("freedraw");
  const [activeColor, setActiveColor] = useState<string>(WHITEBOARD_COLORS[0]);
  const [boardStatus, setBoardStatus] = useState("Whiteboard ready");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const uiOptions = {
    canvasActions: {
      clearCanvas: false,
      export: false as const,
      loadScene: false,
      saveAsImage: false,
      saveToActiveFile: false,
      changeViewBackgroundColor: false,
      toggleTheme: false as const,
    },
    tools: {
      image: false,
    },
  };

  useEffect(() => {
    return () => {
      if (analysisTimerRef.current) {
        window.clearTimeout(analysisTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!tutorTranscript || !apiRef.current || tutorTranscript === lastTutorTranscriptRef.current) {
      return;
    }

    lastTutorTranscriptRef.current = tutorTranscript;
    const transcriptText = tutorTranscript.includes("::")
      ? tutorTranscript.split("::").slice(1).join("::")
      : tutorTranscript;

    const renderTutorVisual = async () => {
      try {
        const response = await fetch("/api/whiteboard/draw", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ transcript: transcriptText }),
        });

        const data = (await response.json()) as DrawResponse;

        if (!response.ok || !data.elements) {
          return;
        }

        const sceneElements = convertToExcalidrawElements(data.elements);
        skipHistoryRef.current = true;
        lastProgrammaticHashRef.current = hashElementsVersion(sceneElements);
        historyRef.current = [{ elements: sceneElements }];
        lastSceneHashRef.current = lastProgrammaticHashRef.current;

        apiRef.current?.updateScene({
          elements: sceneElements,
          appState: {
            viewBackgroundColor: WHITEBOARD_BACKGROUND,
            currentItemStrokeColor: activeColor,
          },
        });
        apiRef.current?.history.clear();
        apiRef.current?.scrollToContent(sceneElements);
        setBoardStatus(`Tutor drew a ${data.label ?? "visual"} on the whiteboard`);
      } catch {
        setBoardStatus("Whiteboard ready");
      }
    };

    void renderTutorVisual();
  }, [activeColor, tutorTranscript]);

  const setTool = (tool: WhiteboardTool) => {
    apiRef.current?.setActiveTool({ type: tool });
    setActiveTool(tool);
  };

  const applyColor = (color: string) => {
    setActiveColor(color);
    apiRef.current?.updateScene({
      appState: {
        currentItemStrokeColor: color,
      },
    });
  };

  const handleClear = () => {
    if (analysisTimerRef.current) {
      window.clearTimeout(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }

    apiRef.current?.resetScene();
    apiRef.current?.history.clear();
    setTool("freedraw");
    applyColor(WHITEBOARD_COLORS[0]);
    setBoardStatus("Whiteboard cleared");
    historyRef.current = [{ elements: [] }];
    lastSceneHashRef.current = 0;
    lastAnalyzedHashRef.current = 0;
    lastProgrammaticHashRef.current = 0;
    lastDescriptionRef.current = "";
  };

  const handleUndo = () => {
    if (!apiRef.current || historyRef.current.length <= 1) {
      return;
    }

    historyRef.current.pop();
    const previous = historyRef.current[historyRef.current.length - 1];
    skipHistoryRef.current = true;
    lastSceneHashRef.current = hashElementsVersion(previous.elements);
    lastProgrammaticHashRef.current = 0;
    apiRef.current.updateScene({
      elements: previous.elements,
      appState: {
        currentItemStrokeColor: activeColor,
        viewBackgroundColor: WHITEBOARD_BACKGROUND,
      },
    });
    setBoardStatus("Undid the last step");
  };

  const scheduleAnalysis = () => {
    if (!sessionActive || !apiRef.current || isAnalyzing) {
      return;
    }

    if (analysisTimerRef.current) {
      window.clearTimeout(analysisTimerRef.current);
    }

    analysisTimerRef.current = window.setTimeout(async () => {
      const api = apiRef.current;

      if (!api) {
        return;
      }

      const sceneElements = api.getSceneElements();
      const sceneHash = hashElementsVersion(sceneElements);

      if (
        sceneElements.length === 0 ||
        sceneHash === 0 ||
        sceneHash === lastAnalyzedHashRef.current ||
        sceneHash === lastProgrammaticHashRef.current
      ) {
        return;
      }

      setIsAnalyzing(true);
      setBoardStatus("Maximus is checking the whiteboard...");

      try {
        const snapshotBlob = await exportToBlob({
          elements: sceneElements,
          appState: {
            ...api.getAppState(),
            exportBackground: true,
            viewBackgroundColor: WHITEBOARD_BACKGROUND,
          },
          files: api.getFiles(),
          mimeType: "image/png",
        });
        const imageDataUrl = await toDataUrl(snapshotBlob);
        const response = await fetch("/api/whiteboard/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageDataUrl }),
        });
        const data = (await response.json()) as AnalyzeResponse;

        if (!response.ok || !data.description || data.description === lastDescriptionRef.current) {
          setBoardStatus("Whiteboard ready");
          return;
        }

        lastAnalyzedHashRef.current = sceneHash;
        lastDescriptionRef.current = data.description;
        onStudentDrawingDescription(data.description);
        setBoardStatus(data.description);
      } catch {
        setBoardStatus("Whiteboard ready");
      } finally {
        setIsAnalyzing(false);
      }
    }, 5000);
  };

  const handleSceneChange = (
    elements: readonly ExcalidrawElement[],
    _appState: AppState,
    _files: BinaryFiles,
  ) => {
    const visibleElements = elements.filter((element) => !element.isDeleted);
    const sceneHash = hashElementsVersion(visibleElements);

    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }

    if (sceneHash !== lastSceneHashRef.current) {
      onStudentActivity?.();
      historyRef.current.push({
        elements: visibleElements,
      });

      if (historyRef.current.length > 60) {
        historyRef.current.shift();
      }

      lastSceneHashRef.current = sceneHash;
      setBoardStatus(visibleElements.length ? "Whiteboard updated" : "Whiteboard ready");
      scheduleAnalysis();
    }
  };

  return (
    <section className="flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-[2rem] border border-lagoon/10 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-lagoon/10 px-4 py-3 sm:px-5">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-lagoon/60">Shared whiteboard</p>
          <p className="mt-1 text-sm text-ink/70">{boardStatus}</p>
        </div>
        <div className="rounded-full bg-lagoon/10 px-3 py-1 text-xs font-bold text-lagoon">
          {sessionActive ? "Live with voice" : "Draw anytime"}
        </div>
      </div>

      <div className="whiteboard-shell relative flex-1 bg-[#fffdf7]">
        <Excalidraw
          excalidrawAPI={(api) => {
            if (!api) {
              return;
            }

            apiRef.current = api;
            api.updateScene({
              appState: {
                viewBackgroundColor: WHITEBOARD_BACKGROUND,
                currentItemStrokeColor: activeColor,
              },
            });
            api.setActiveTool({ type: "freedraw" });
          }}
          initialData={{
            appState: {
              viewBackgroundColor: WHITEBOARD_BACKGROUND,
              currentItemStrokeColor: WHITEBOARD_COLORS[0],
            },
          }}
          onChange={handleSceneChange}
          UIOptions={uiOptions}
          zenModeEnabled
          detectScroll={false}
        />
      </div>

      <div className="border-t border-lagoon/10 bg-white px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          {TOOL_OPTIONS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => setTool(tool.id)}
              className={`min-h-12 rounded-2xl border px-4 text-sm font-bold transition ${
                activeTool === tool.id
                  ? "border-lagoon bg-lagoon text-white"
                  : "border-lagoon/10 bg-lagoon/5 text-ink"
              }`}
            >
              <span className="mr-2" aria-hidden="true">
                {tool.icon}
              </span>
              {tool.label}
            </button>
          ))}

          <button
            type="button"
            onClick={handleUndo}
            className="min-h-12 rounded-2xl border border-lagoon/10 bg-lagoon/5 px-4 text-sm font-bold text-ink transition hover:bg-lagoon/10"
          >
            Undo
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="min-h-12 rounded-2xl bg-coral px-4 text-sm font-bold text-white transition hover:bg-coral/90"
          >
            Clear
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-lagoon/55">Colors</span>
          {WHITEBOARD_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => applyColor(color)}
              aria-label={`Use ${color} ink`}
              className={`h-10 w-10 rounded-full border-4 transition ${
                activeColor === color ? "border-ink scale-105" : "border-white"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          {isAnalyzing && <span className="text-sm font-semibold text-lagoon">Analyzing latest work...</span>}
        </div>
      </div>
    </section>
  );
}
