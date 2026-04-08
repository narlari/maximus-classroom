"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  appendClassroomV2ReviewLaunchHandoff,
  appendClassroomV2ReviewReturnReport,
  clearClassroomV2ReviewMemory,
  getClassroomV2ReviewGuidance,
  getClassroomV2ReviewLaunchHandoff,
  getClassroomV2TargetedReviewLaunchHandoff,
  parseClassroomV2ReviewReturnReport,
  readClassroomV2ReviewMemory,
  type ClassroomV2ReviewBeatKey,
  type ClassroomV2ReviewMemoryRecord,
  type ClassroomV2ReviewReturnReport,
} from "@/lib/classroom-v2/review-memory";

type Props = {
  studentId: string;
  useClassroomV2: boolean;
  previewHref: string;
  legacyHref: string;
  reviewSteps: readonly string[];
  reviewFocus: readonly string[];
  returnReport: ClassroomV2ReviewReturnReport | null;
};

export function ClassroomV2ReviewMemoryCard({
  studentId,
  useClassroomV2,
  previewHref,
  legacyHref,
  reviewSteps,
  reviewFocus,
  returnReport,
}: Props) {
  const searchParams = useSearchParams();
  const [memory, setMemory] = useState<ClassroomV2ReviewMemoryRecord | null>(null);

  useEffect(() => {
    const syncMemory = () => {
      setMemory(readClassroomV2ReviewMemory(studentId));
    };

    syncMemory();
    window.addEventListener("storage", syncMemory);
    window.addEventListener("classroom-v2-review-memory-updated", syncMemory as EventListener);

    return () => {
      window.removeEventListener("storage", syncMemory);
      window.removeEventListener("classroom-v2-review-memory-updated", syncMemory as EventListener);
    };
  }, [studentId]);

  const confirmedBeats = useMemo(() => memory?.beats.filter((beat) => beat.done) ?? [], [memory]);
  const guidance = useMemo(() => getClassroomV2ReviewGuidance(memory), [memory]);
  const launchHref = useMemo(
    () => appendClassroomV2ReviewLaunchHandoff(previewHref, getClassroomV2ReviewLaunchHandoff(memory)),
    [memory, previewHref],
  );
  const targetedBeatLaunches = useMemo(
    () =>
      REVIEW_BEAT_LAUNCHERS.map((beat) => ({
        ...beat,
        href: appendClassroomV2ReviewLaunchHandoff(
          previewHref,
          getClassroomV2TargetedReviewLaunchHandoff({
            memory,
            beatKey: beat.key,
          }),
        ),
      })),
    [memory, previewHref],
  );
  const previewReturnReport = useMemo(
    () =>
      parseClassroomV2ReviewReturnReport({
        reviewMode: searchParams.get("reviewMode") ?? undefined,
        reviewBeat: searchParams.get("reviewBeat") ?? undefined,
        reviewTargeted: searchParams.get("reviewTargeted") ?? undefined,
        reviewReturned: "1",
        reviewConfirmed: undefined,
      }),
    [searchParams],
  );
  const previewReturnHref = useMemo(() => {
    if (!previewReturnReport) {
      return legacyHref;
    }

    const confirmed = previewReturnReport.beatKey
      ? Boolean(memory?.beats.find((beat) => beat.key === previewReturnReport.beatKey)?.done)
      : false;

    return appendClassroomV2ReviewReturnReport(legacyHref, {
      ...previewReturnReport,
      confirmed,
    });
  }, [legacyHref, memory, previewReturnReport]);

  const handleClearMemory = () => {
    clearClassroomV2ReviewMemory(studentId);
    setMemory(null);
    window.dispatchEvent(new Event("classroom-v2-review-memory-updated"));
  };

  return (
    <div className="pointer-events-auto rounded-2xl border border-sky-400/20 bg-[#081120]/92 p-4 shadow-[0_22px_60px_rgba(4,10,24,0.5)] backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-200/80">
        {useClassroomV2 ? "Reviewing V2 now" : "V2 review path"}
      </p>
      <p className="mt-2 text-sm font-semibold text-white">{guidance.headline}</p>
      <p className="mt-2 text-xs leading-5 text-slate-300">
        {useClassroomV2
          ? "Legacy VoiceSession still stays the default classroom outside this explicit preview mode."
          : guidance.detail}
      </p>

      <div className="mt-3 rounded-2xl border border-white/10 bg-[#0b1328]/75 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">
              {guidance.mode === "start"
                ? "Recommended next move"
                : guidance.mode === "continue"
                  ? "Resume point"
                  : "Review status"}
            </p>
            <p className="mt-2 text-sm font-semibold text-white">{guidance.summary}</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
            {memory ? `${memory.confirmedCount}/${memory.totalCount}` : "0/4"}
          </span>
        </div>

        {guidance.nextBeat ? (
          <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-100/80">Next unconfirmed beat</p>
            <p className="mt-2 text-sm font-semibold text-white">{guidance.nextBeat.label}</p>
            <p className="mt-1 text-xs leading-5 text-white/70">{guidance.nextBeat.detail}</p>
          </div>
        ) : guidance.mode === "recheck" ? (
          <div className="mt-3 rounded-2xl border border-mint/25 bg-mint/10 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mint/85">Route-level review complete</p>
            <p className="mt-2 text-xs leading-5 text-white/75">
              Every remembered beat is confirmed. Relaunch preview only to re-check the seam or sanity-check that nothing regressed.
            </p>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-white/5 p-3 text-xs leading-5 text-white/60">
            No remembered beat is confirmed yet. Use the launcher below to start the first route-level V2 review pass.
          </div>
        )}

        {memory ? <p className="mt-3 text-[11px] text-white/45">Updated {formatUpdatedAt(memory.updatedAt)}</p> : null}
      </div>

      {!useClassroomV2 && returnReport ? (
        <div className={`mt-3 rounded-2xl border p-3 ${returnReport.confirmed ? "border-mint/25 bg-mint/10" : "border-amber-300/25 bg-amber-300/10"}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">Returned from preview</p>
              <p className="mt-2 text-sm font-semibold text-white">{getReturnReportHeadline(returnReport)}</p>
              <p className="mt-2 text-xs leading-5 text-white/70">{getReturnReportDetail(returnReport)}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${returnReport.confirmed ? "bg-mint/20 text-mint" : "bg-amber-300/20 text-amber-100"}`}
            >
              {returnReport.confirmed ? "confirmed" : "not yet confirmed"}
            </span>
          </div>
        </div>
      ) : null}

      <div className="mt-3 rounded-2xl border border-white/10 bg-[#0b1328]/75 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">
          {useClassroomV2 ? "What to review here" : "Review path"}
        </p>
        <ol className="mt-2 space-y-2 text-xs leading-5 text-slate-300">
          {reviewSteps.map((step, index) => (
            <li key={step} className="flex gap-2">
              <span className="text-sky-200/80">{index + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-[#0b1328]/75 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">Remembered review beats</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              Browser-local per student. This keeps the latest confirmed V2 review beats visible around the launcher even after leaving preview.
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
            {memory ? `${memory.confirmedCount}/${memory.totalCount}` : "0/4"}
          </span>
        </div>

        {memory ? (
          <>
            <div className="mt-3 space-y-2">
              {memory.beats.map((beat) => (
                <div
                  key={beat.key}
                  className={`rounded-2xl border p-3 ${beat.done ? "border-mint/25 bg-mint/10" : "border-white/10 bg-white/5"}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        beat.done ? "bg-mint/20 text-mint" : "bg-white/10 text-white/45"
                      }`}
                    >
                      {beat.done ? "✓" : "○"}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{beat.label}</p>
                      <p className="mt-1 text-xs leading-5 text-white/65">{beat.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {confirmedBeats.length > 0 ? (
              <p className="mt-3 text-xs leading-5 text-mint/90">
                Latest confirmed beats: {confirmedBeats.map((beat) => beat.label).join(" · ")}
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {reviewFocus.map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/75"
          >
            {item}
          </span>
        ))}
      </div>

      {!useClassroomV2 ? (
        <div className="mt-3 rounded-2xl border border-white/10 bg-[#0b1328]/75 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">Jump to a specific review beat</p>
          <p className="mt-2 text-xs leading-5 text-slate-300">
            These route-level launchers skip straight to one exact V2 preview moment for quick sanity checks while keeping the normal remembered launcher above intact.
          </p>
          <div className="mt-3 grid gap-2">
            {targetedBeatLaunches.map((beat) => (
              <Link
                key={beat.key}
                href={beat.href}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition hover:border-sky-300/30 hover:bg-sky-300/10"
              >
                <p className="text-xs font-semibold text-white">{beat.label}</p>
                <p className="mt-1 text-[11px] leading-5 text-white/65">{beat.detail}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {useClassroomV2 ? (
          <Link
            href={previewReturnHref}
            className="inline-flex items-center rounded-full border border-white/15 bg-[#0d1830] px-4 py-2 text-xs font-semibold text-white transition hover:border-white/30 hover:bg-[#112042]"
          >
            Return to default classroom
          </Link>
        ) : (
          <Link
            href={launchHref}
            className="inline-flex items-center rounded-full bg-sky-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-300"
          >
            {guidance.mode === "continue"
              ? "Continue V2 review"
              : guidance.mode === "recheck"
                ? "Re-check V2 preview"
                : "Launch V2 preview"}
          </Link>
        )}

        <button
          type="button"
          onClick={handleClearMemory}
          disabled={!memory}
          className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold transition ${
            memory
              ? "border border-white/15 bg-white/5 text-white hover:bg-white/10"
              : "cursor-not-allowed border border-white/10 bg-white/5 text-white/35"
          }`}
        >
          Clear remembered review
        </button>
      </div>
    </div>
  );
}

const REVIEW_BEAT_LAUNCHERS: Array<{
  key: ClassroomV2ReviewBeatKey;
  label: string;
  detail: string;
}> = [
  {
    key: "teacher-setup",
    label: "Teacher setup",
    detail: "Open preview at the opening teacher-owned board setup beat.",
  },
  {
    key: "student-turn",
    label: "Student turn",
    detail: "Open preview directly at the explicit student answer window.",
  },
  {
    key: "review-handoff",
    label: "Review handoff",
    detail: "Open preview at the answer-submitted to teacher-review bridge.",
  },
  {
    key: "lesson-close",
    label: "Lesson close",
    detail: "Open preview at the final landed lesson-close posture.",
  },
];

function getReturnReportHeadline(report: ClassroomV2ReviewReturnReport) {
  const beatLabel = report.beatKey ? getReviewBeatLabel(report.beatKey) : "the requested review path";

  if (report.targeted) {
    return `Returned from targeted review of ${beatLabel}.`;
  }

  return `Returned from ${report.mode === "recheck" ? "a confidence pass" : "the route-level review flow"} at ${beatLabel}.`;
}

function getReturnReportDetail(report: ClassroomV2ReviewReturnReport) {
  const beatLabel = report.beatKey ? getReviewBeatLabel(report.beatKey) : "that checkpoint";

  if (report.confirmed) {
    return `${beatLabel} is now confirmed in the remembered review checklist, so Sung can either keep moving forward or return later for another spot check.`;
  }

  return `${beatLabel} was the last reviewed checkpoint, but it is not confirmed yet. Reopen preview from this route whenever you want to inspect that beat again.`;
}

function getReviewBeatLabel(beatKey: ClassroomV2ReviewBeatKey) {
  switch (beatKey) {
    case "teacher-setup":
      return "Teacher setup";
    case "student-turn":
      return "Student turn";
    case "review-handoff":
      return "Review handoff";
    case "lesson-close":
      return "Lesson close";
  }
}

function formatUpdatedAt(value: string) {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return "recently";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}
