"use client";

import { useState } from "react";
import type { ParentDashboard, SessionEvent } from "@/lib/db";

type Props = {
  dashboard: ParentDashboard;
};

function formatDate(dateString: string | null) {
  if (!dateString) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function masteryTone(mastery: number) {
  if (mastery < 40) {
    return "bg-coral";
  }

  if (mastery <= 70) {
    return "bg-mango";
  }

  return "bg-lagoon";
}

function getTranscriptRole(event: SessionEvent) {
  const role = typeof event.metadata?.role === "string" ? event.metadata.role.toLowerCase() : "";
  const speaker = typeof event.metadata?.speaker === "string" ? event.metadata.speaker.toLowerCase() : "";

  if (role === "student" || speaker === "student") {
    return "student";
  }

  if (role === "tutor" || speaker === "tutor" || speaker === "assistant") {
    return "tutor";
  }

  return null;
}

export function ParentDashboardClient({ dashboard }: Props) {
  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>({});
  const [expandedTranscriptIds, setExpandedTranscriptIds] = useState<Record<string, boolean>>({});

  const toggleSession = (sessionId: string) => {
    setExpandedSessionIds((current) => ({
      ...current,
      [sessionId]: !current[sessionId],
    }));
  };

  const toggleTranscript = (sessionId: string) => {
    setExpandedTranscriptIds((current) => ({
      ...current,
      [sessionId]: !current[sessionId],
    }));
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(21,50,74,0.06)]">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">API Cost</p>
          <p className="mt-3 text-3xl font-black text-slate-900">{formatMoney(dashboard.costs.weekCents)}</p>
          <p className="mt-2 text-sm text-slate-500">This week</p>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(21,50,74,0.06)]">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">API Cost</p>
          <p className="mt-3 text-3xl font-black text-slate-900">{formatMoney(dashboard.costs.monthCents)}</p>
          <p className="mt-2 text-sm text-slate-500">Last 30 days</p>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(21,50,74,0.06)]">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Students</p>
          <p className="mt-3 text-3xl font-black text-slate-900">{dashboard.students.length}</p>
          <p className="mt-2 text-sm text-slate-500">Active learners</p>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(21,50,74,0.06)]">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Completed</p>
          <p className="mt-3 text-3xl font-black text-slate-900">
            {dashboard.students.reduce((sum, entry) => sum + entry.totalSessions, 0)}
          </p>
          <p className="mt-2 text-sm text-slate-500">Sessions total</p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {dashboard.students.map((entry) => (
          <article
            key={entry.student.id}
            className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_22px_70px_rgba(21,50,74,0.06)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Student</p>
                <h2 className="mt-2 text-3xl font-black text-slate-900">{entry.student.name}</h2>
                <p className="mt-2 text-base text-slate-600">Grade {entry.student.gradeLevel}</p>
              </div>
              <div className="rounded-[1.5rem] bg-slate-50 px-4 py-3 text-right">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Completed</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{entry.totalSessions}</p>
                <p className="text-sm text-slate-500">sessions</p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Last session</p>
                  <p className="mt-2 text-lg font-black text-slate-900">{formatDate(entry.lastSession?.endedAt ?? entry.lastSession?.startedAt ?? null)}</p>
                </div>
                <div className="rounded-full bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm">
                  {entry.lastSession?.durationMinutes ?? 0} min
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {entry.lastSession?.summary ?? "No completed sessions yet."}
              </p>
            </div>

            {entry.flaggedEvents.length > 0 ? (
              <div className="mt-5 rounded-[1.5rem] border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-600">Parent review</p>
                <div className="mt-3 space-y-2">
                  {entry.flaggedEvents.slice(0, 3).map((event) => (
                    <div key={event.id} className="rounded-2xl bg-white px-3 py-3 text-sm text-slate-700">
                      <p className="font-bold text-slate-900">{event.flagReason ?? "Flagged event"}</p>
                      <p className="mt-1">{event.content ?? "No event text saved."}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">{formatDate(event.timestamp)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-5">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Skill progress</p>
              <div className="mt-3 space-y-4">
                {entry.progressByDomain.map((domainGroup) => (
                  <div key={domainGroup.domain} className="rounded-[1.5rem] bg-[#fcfcfd] p-4">
                    <p className="text-sm font-black text-slate-900">{domainGroup.domain}</p>
                    <div className="mt-3 space-y-3">
                      {domainGroup.skills.map((skill) => (
                        <div key={skill.id}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-slate-900">{skill.standardName ?? skill.standardCode}</p>
                            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{skill.standardCode}</p>
                          </div>
                          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full ${masteryTone(skill.masteryLevel)}`}
                              style={{ width: `${skill.masteryLevel}%` }}
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                            <span>{skill.masteryLevel}% mastery</span>
                            <span>{skill.attempts} attempts</span>
                            <span>Last practiced {formatDate(skill.lastPracticed)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Recent sessions</p>
              <div className="mt-3 space-y-3">
                {entry.recentSessions.map((session) => {
                  const isExpanded = Boolean(expandedSessionIds[session.id]);
                  const isTranscriptExpanded = Boolean(expandedTranscriptIds[session.id]);
                  const transcriptEvents = session.events.filter((event) => getTranscriptRole(event) !== null);

                  return (
                    <div key={session.id} className="rounded-[1.5rem] border border-slate-200 bg-[#fbfcff] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-900">{formatDate(session.endedAt ?? session.startedAt)}</p>
                          <p className="mt-1 text-sm text-slate-500">{session.durationMinutes ?? 0} minutes</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => toggleTranscript(session.id)}
                            className="rounded-full bg-blue-100 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700"
                          >
                            {isTranscriptExpanded ? "Hide transcript" : "View transcript"}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSession(session.id)}
                            className="rounded-full bg-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-700"
                          >
                            {isExpanded ? "Hide details" : "Show details"}
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {session.topicsCovered.length > 0 ? (
                          session.topicsCovered.map((topic) => (
                            <span
                              key={`${session.id}-${topic}`}
                              className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"
                            >
                              {topic}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">General math</span>
                        )}
                      </div>

                      <p className="mt-3 text-sm leading-6 text-slate-600">{session.summary ?? "Summary pending."}</p>
                      <p className="mt-2 text-sm text-slate-500">{session.performanceNotes ?? "No performance note saved."}</p>

                      {isTranscriptExpanded ? (
                        <div className="mt-4 rounded-[1.25rem] border border-blue-100 bg-white p-3">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Full transcript</p>
                          <div className="mt-3 space-y-3">
                            {transcriptEvents.length > 0 ? (
                              transcriptEvents.map((event) => {
                                const role = getTranscriptRole(event);
                                const isStudent = role === "student";

                                return (
                                  <div
                                    key={event.id}
                                    className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                                      isStudent
                                        ? "bg-slate-100 text-slate-800"
                                        : "ml-auto bg-blue-600 text-white"
                                    }`}
                                  >
                                    <p className={`font-bold ${isStudent ? "text-slate-900" : "text-white"}`}>
                                      {isStudent ? "🎤 Student" : "🤖 Maximus"}
                                    </p>
                                    <p className="mt-1 whitespace-pre-wrap leading-6">
                                      {event.content ?? "No transcript saved."}
                                    </p>
                                    <p
                                      className={`mt-2 text-xs uppercase tracking-[0.14em] ${
                                        isStudent ? "text-slate-500" : "text-blue-100"
                                      }`}
                                    >
                                      {formatDate(event.timestamp)}
                                    </p>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-sm text-slate-500">No transcript saved for this session.</p>
                            )}
                          </div>
                        </div>
                      ) : null}

                      {isExpanded ? (
                        <div className="mt-4 rounded-[1.25rem] bg-white p-3">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Event log</p>
                          <div className="mt-3 space-y-2">
                            {session.events.length > 0 ? (
                              session.events.map((event) => (
                                <div key={event.id} className="rounded-xl bg-[#f7fafc] px-3 py-3 text-sm text-slate-700">
                                  <p className="font-bold text-slate-900">
                                    {event.flagged ? "⚠️ " : ""}
                                    {event.eventType.replace(/_/g, " ")}
                                  </p>
                                  <p className="mt-1">{event.content ?? "No content."}</p>
                                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                                    {formatDate(event.timestamp)}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-slate-500">No events saved for this session.</p>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
