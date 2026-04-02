import { getGradeStandards, getRecentSessions, getSessionById, getSessionEvents, getStudentById, updateSessionDetails, applySkillUpdates } from "@/lib/db";

type SessionSummaryResult = {
  summary: string;
  performanceNotes: string;
  topicsCovered: string[];
  skillUpdates: Array<{
    standardCode: string;
    standardName?: string | null;
    masteryLevel?: number | null;
    attemptsDelta?: number | null;
  }>;
  apiCostCents?: number;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export const BASE_TUTOR_INSTRUCTIONS = `You are Maximus, a fun and patient AI math tutor for kids. You're talking to an elementary school student.

Rules:
- You ONLY tutor math. If asked about other topics, gently redirect: "That's a great question for your parents! But let's get back to math."
- Be encouraging and patient. Use growth mindset language: "You haven't gotten it YET" not "That's wrong."
- Keep explanations simple and age-appropriate.
- Use real-world examples kids relate to (pizza slices, candy, toys, games).
- Ask guiding questions instead of just giving answers (Socratic method).
- Celebrate correct answers enthusiastically.
- If the student seems stuck, break the problem into smaller steps.
- If the student seems frustrated, offer encouragement and suggest a simpler problem.
- Keep your responses concise because kids lose attention with long explanations.
- You can do light small talk but always steer back to math.
- NEVER ask for personal information such as address, school name, passwords, or last name.
- NEVER discuss violence, politics, religion, or adult content.
- If something concerning is said, respond kindly and redirect to math.
`;

export const WHITEBOARD_INSTRUCTIONS = `
You also have a shared whiteboard visible to both you and the student.
- When explaining concepts, say things like "Let me show you on the whiteboard" or "Look at what I'm drawing"
- You'll receive descriptions of what the student draws. Respond to their drawings directly.
- Encourage students to show their work on the whiteboard.
- Use visual examples such as pizza slices for fractions, groups of objects for multiplication, and number lines for addition.
`;

function safeJsonParse(value: string): SessionSummaryResult | null {
  try {
    return JSON.parse(value) as SessionSummaryResult;
  } catch {
    return null;
  }
}

function buildFallbackSummary(sessionId: string): SessionSummaryResult {
  const session = getSessionById(sessionId);
  const student = session ? getStudentById(session.studentId) : null;
  const events = getSessionEvents(sessionId, 8);
  const topicsCovered = events
    .map((event) => event.content?.replace(/^Student (wrote|drew):\s*/i, "").trim())
    .filter((content): content is string => Boolean(content))
    .slice(0, 3);

  return {
    summary: student
      ? `${student.name} spent this session practicing ${topicsCovered[0] ?? "grade-level math"} with Maximus.`
      : "The student completed a short tutoring session with Maximus.",
    performanceNotes:
      topicsCovered.length > 0
        ? `Observed work included ${topicsCovered.join(", ")}. Keep building consistency with similar problems next session.`
        : "Only limited session detail was captured, so continue with a brief warm-up review next time.",
    topicsCovered,
    skillUpdates: [],
    apiCostCents: 0,
  };
}

export function buildStudentRealtimeInstructions(studentId: string) {
  const student = getStudentById(studentId);

  if (!student) {
    return `${BASE_TUTOR_INSTRUCTIONS}${WHITEBOARD_INSTRUCTIONS}

Start by greeting the student warmly and asking what they'd like to work on today, or suggest a topic based on their grade level.`;
  }

  const recentSessions = getRecentSessions(studentId, 3).filter((session) => session.summary);
  const priorContext = recentSessions.length
    ? recentSessions
        .map((session, index) => {
          const topics = session.topicsCovered.length > 0 ? session.topicsCovered.join(", ") : "general math practice";
          return `Recent session ${index + 1}: covered ${topics}. Performance: ${session.performanceNotes ?? session.summary ?? "No performance note recorded."}`;
        })
        .join("\n")
    : "No previous session summaries are available yet.";

  return `${BASE_TUTOR_INSTRUCTIONS}${WHITEBOARD_INSTRUCTIONS}

This student is ${student.name}, grade ${student.gradeLevel}.
${priorContext}

Today, continue from where they left off or introduce the next topic that fits grade ${student.gradeLevel} math.
Start by greeting ${student.name} by name, then connect to the previous work when relevant.`;
}

export async function finalizeSession(sessionId: string) {
  const session = getSessionById(sessionId);

  if (!session) {
    throw new Error("Session not found.");
  }

  const student = getStudentById(session.studentId);

  if (!student) {
    throw new Error("Student not found.");
  }

  const endedAt = new Date().toISOString();
  const durationMinutes = Math.max(
    1,
    Math.round(
      (new Date(endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000,
    ),
  );

  const events = getSessionEvents(sessionId, 18);
  let summaryResult = buildFallbackSummary(sessionId);

  if (process.env.OPENAI_API_KEY) {
    const standards = getGradeStandards(student.gradeLevel)
      .map((standard) => `${standard.standardCode}: ${standard.standardName}`)
      .join("\n");
    const eventTranscript = events.length
      ? events
          .map((event) => `${event.timestamp} [${event.eventType}] ${event.content ?? ""}`.trim())
          .join("\n")
      : "No events were captured.";

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          response_format: {
            type: "json_object",
          },
          messages: [
            {
              role: "system",
              content:
                "You summarize elementary tutoring sessions. Return strict JSON with keys summary, performanceNotes, topicsCovered, and skillUpdates. skillUpdates must be an array of objects with standardCode, standardName, masteryLevel, and attemptsDelta.",
            },
            {
              role: "user",
              content: `Summarize this tutoring session for a parent. What was covered, how did the student do, and what should they work on next?

Student: ${student.name}
Grade: ${student.gradeLevel}
Available standards:
${standards}

Session events:
${eventTranscript}

Requirements:
- summary: 2 to 4 sentences, parent-facing.
- performanceNotes: 1 to 2 sentences, concise.
- topicsCovered: array of short strings.
- skillUpdates: only include standards with clear evidence from the session. masteryLevel must be 0-100. attemptsDelta should usually be 1.`,
            },
          ],
        }),
        cache: "no-store",
      });

      if (response.ok) {
        const data = (await response.json()) as ChatCompletionResponse;
        const content = data.choices?.[0]?.message?.content?.trim();
        const parsed = content ? safeJsonParse(content) : null;

        if (parsed?.summary && parsed.performanceNotes && Array.isArray(parsed.topicsCovered)) {
          summaryResult = {
            summary: parsed.summary,
            performanceNotes: parsed.performanceNotes,
            topicsCovered: parsed.topicsCovered,
            skillUpdates: Array.isArray(parsed.skillUpdates) ? parsed.skillUpdates : [],
            apiCostCents: 0,
          };
        }
      }
    } catch {
      summaryResult = buildFallbackSummary(sessionId);
    }
  }

  if (summaryResult.skillUpdates.length > 0) {
    applySkillUpdates(student.id, summaryResult.skillUpdates);
  }

  const updated = updateSessionDetails({
    sessionId,
    endedAt,
    durationMinutes,
    summary: summaryResult.summary,
    performanceNotes: summaryResult.performanceNotes,
    topicsCovered: summaryResult.topicsCovered,
    apiCostCents: summaryResult.apiCostCents ?? 0,
  });

  if (!updated) {
    throw new Error("Failed to finalize session.");
  }

  return updated;
}
