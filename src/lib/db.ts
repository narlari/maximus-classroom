import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";

type StudentRow = {
  id: string;
  name: string;
  grade_level: number;
  avatar_id: string;
  created_at: string;
};

type SessionRow = {
  id: string;
  student_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  summary: string | null;
  topics_covered: string | null;
  performance_notes: string | null;
  api_cost_cents: number;
};

type SkillProgressRow = {
  id: string;
  student_id: string;
  standard_code: string;
  standard_name: string | null;
  mastery_level: number;
  attempts: number;
  last_practiced: string | null;
};

type SessionEventRow = {
  id: string;
  session_id: string;
  event_type: string;
  content: string | null;
  metadata: string | null;
  timestamp: string;
};

export type Student = {
  id: string;
  name: string;
  gradeLevel: number;
  avatarId: string;
  createdAt: string;
};

export type Session = {
  id: string;
  studentId: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  summary: string | null;
  topicsCovered: string[];
  performanceNotes: string | null;
  apiCostCents: number;
};

export type SkillProgress = {
  id: string;
  studentId: string;
  standardCode: string;
  standardName: string | null;
  masteryLevel: number;
  attempts: number;
  lastPracticed: string | null;
};

export type SessionEvent = {
  id: string;
  sessionId: string;
  eventType: string;
  content: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
};

export type StudentCard = Student & {
  lastSessionAt: string | null;
};

export type StudentProfile = {
  student: Student;
  recentSessions: Session[];
};

export type SkillSeed = {
  standardCode: string;
  standardName: string;
};

export type SkillUpdateInput = {
  standardCode: string;
  standardName?: string | null;
  masteryLevel?: number | null;
  attemptsDelta?: number | null;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "classroom.db");

const GRADE_STANDARDS: Record<number, SkillSeed[]> = {
  2: [
    { standardCode: "2.OA.1", standardName: "Use addition and subtraction within 100 to solve one- and two-step word problems" },
    { standardCode: "2.OA.2", standardName: "Fluently add and subtract within 20" },
    { standardCode: "2.NBT.1", standardName: "Understand place value up to 1,000" },
    { standardCode: "2.NBT.5", standardName: "Fluently add and subtract within 100 using place value strategies" },
    { standardCode: "2.MD.1", standardName: "Measure and estimate lengths in standard units" },
    { standardCode: "2.G.1", standardName: "Recognize and draw shapes with specified attributes" },
  ],
  4: [
    { standardCode: "4.OA.1", standardName: "Interpret multiplication equations as comparisons" },
    { standardCode: "4.OA.3", standardName: "Solve multistep word problems using the four operations" },
    { standardCode: "4.NBT.4", standardName: "Fluently add and subtract multi-digit whole numbers" },
    { standardCode: "4.NBT.5", standardName: "Multiply a whole number of up to four digits by a one-digit whole number" },
    { standardCode: "4.NF.1", standardName: "Explain why a fraction is equivalent to another fraction" },
    { standardCode: "4.NF.3", standardName: "Understand fraction addition and subtraction" },
    { standardCode: "4.MD.5", standardName: "Understand concepts of angle measurement" },
    { standardCode: "4.G.1", standardName: "Draw and identify points, lines, rays, and angles" },
  ],
};

let database: Database.Database | null = null;

function parseJsonArray(value: string | null): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseMetadata(value: string | null): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function toStudent(row: StudentRow): Student {
  return {
    id: row.id,
    name: row.name,
    gradeLevel: row.grade_level,
    avatarId: row.avatar_id,
    createdAt: row.created_at,
  };
}

function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    studentId: row.student_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMinutes: row.duration_minutes,
    summary: row.summary,
    topicsCovered: parseJsonArray(row.topics_covered),
    performanceNotes: row.performance_notes,
    apiCostCents: row.api_cost_cents,
  };
}

function toSkillProgress(row: SkillProgressRow): SkillProgress {
  return {
    id: row.id,
    studentId: row.student_id,
    standardCode: row.standard_code,
    standardName: row.standard_name,
    masteryLevel: row.mastery_level,
    attempts: row.attempts,
    lastPracticed: row.last_practiced,
  };
}

function toSessionEvent(row: SessionEventRow): SessionEvent {
  return {
    id: row.id,
    sessionId: row.session_id,
    eventType: row.event_type,
    content: row.content,
    metadata: parseMetadata(row.metadata),
    timestamp: row.timestamp,
  };
}

function initializeDatabase(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      grade_level INTEGER NOT NULL,
      avatar_id TEXT DEFAULT 'default',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id),
      started_at TEXT DEFAULT (datetime('now')),
      ended_at TEXT,
      duration_minutes INTEGER,
      summary TEXT,
      topics_covered TEXT,
      performance_notes TEXT,
      api_cost_cents INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS skill_progress (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id),
      standard_code TEXT NOT NULL,
      standard_name TEXT,
      mastery_level INTEGER DEFAULT 0,
      attempts INTEGER DEFAULT 0,
      last_practiced TEXT,
      UNIQUE(student_id, standard_code)
    );

    CREATE TABLE IF NOT EXISTS session_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      event_type TEXT NOT NULL,
      content TEXT,
      metadata TEXT,
      timestamp TEXT DEFAULT (datetime('now'))
    );
  `);

  const seedStudents = db.prepare(`
    INSERT OR IGNORE INTO students (id, name, grade_level)
    VALUES (@id, @name, @grade_level)
  `);

  seedStudents.run({ id: "ariana-001", name: "Ariana", grade_level: 4 });
  seedStudents.run({ id: "liam-001", name: "Liam", grade_level: 2 });

  const students = db.prepare("SELECT * FROM students").all() as StudentRow[];
  const seedProgress = db.prepare(`
    INSERT OR IGNORE INTO skill_progress (
      id,
      student_id,
      standard_code,
      standard_name,
      mastery_level,
      attempts
    ) VALUES (
      @id,
      @student_id,
      @standard_code,
      @standard_name,
      0,
      0
    )
  `);

  for (const student of students) {
    const standards = GRADE_STANDARDS[student.grade_level] ?? [];

    for (const standard of standards) {
      seedProgress.run({
        id: uuidv4(),
        student_id: student.id,
        standard_code: standard.standardCode,
        standard_name: standard.standardName,
      });
    }
  }
}

export function getDb() {
  if (!database) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    database = new Database(DB_PATH);
    database.pragma("journal_mode = WAL");
    initializeDatabase(database);
  }

  return database;
}

export function getGradeStandards(gradeLevel: number) {
  return GRADE_STANDARDS[gradeLevel] ?? [];
}

export function listStudents(): StudentCard[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT
        students.*,
        MAX(COALESCE(sessions.ended_at, sessions.started_at)) AS last_session_at
      FROM students
      LEFT JOIN sessions ON sessions.student_id = students.id
      GROUP BY students.id
      ORDER BY students.name ASC
    `,
    )
    .all() as Array<StudentRow & { last_session_at: string | null }>;

  return rows.map((row) => ({
    ...toStudent(row),
    lastSessionAt: row.last_session_at,
  }));
}

export function getStudentById(studentId: string): Student | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM students WHERE id = ?").get(studentId) as StudentRow | undefined;
  return row ? toStudent(row) : null;
}

export function getRecentSessions(studentId: string, limit = 3): Session[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT *
      FROM sessions
      WHERE student_id = ?
      ORDER BY datetime(COALESCE(ended_at, started_at)) DESC
      LIMIT ?
    `,
    )
    .all(studentId, limit) as SessionRow[];

  return rows.map((row) => toSession(row));
}

export function getStudentProfile(studentId: string): StudentProfile | null {
  const student = getStudentById(studentId);

  if (!student) {
    return null;
  }

  return {
    student,
    recentSessions: getRecentSessions(studentId, 3),
  };
}

export function getStudentProgress(studentId: string): SkillProgress[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT *
      FROM skill_progress
      WHERE student_id = ?
      ORDER BY standard_code ASC
    `,
    )
    .all(studentId) as SkillProgressRow[];

  return rows.map((row) => toSkillProgress(row));
}

export function createSession(studentId: string): Session {
  const db = getDb();
  const id = uuidv4();
  db.prepare("INSERT INTO sessions (id, student_id) VALUES (?, ?)").run(id, studentId);
  const session = getSessionById(id);

  if (!session) {
    throw new Error("Failed to create session.");
  }

  return session;
}

export function getSessionById(sessionId: string): Session | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as SessionRow | undefined;
  return row ? toSession(row) : null;
}

export function getSessionEvents(sessionId: string, limit?: number): SessionEvent[] {
  const db = getDb();
  const rows = typeof limit === "number"
    ? db
        .prepare(
          `
          SELECT *
          FROM session_events
          WHERE session_id = ?
          ORDER BY datetime(timestamp) DESC
          LIMIT ?
        `,
        )
        .all(sessionId, limit) as SessionEventRow[]
    : db
        .prepare(
          `
          SELECT *
          FROM session_events
          WHERE session_id = ?
          ORDER BY datetime(timestamp) ASC
        `,
        )
        .all(sessionId) as SessionEventRow[];

  const normalizedRows = typeof limit === "number" ? [...rows].reverse() : rows;
  return normalizedRows.map((row) => toSessionEvent(row));
}

export function logSessionEvent(input: {
  sessionId: string;
  eventType: string;
  content?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const db = getDb();
  const id = uuidv4();
  db.prepare(
    `
    INSERT INTO session_events (id, session_id, event_type, content, metadata)
    VALUES (?, ?, ?, ?, ?)
  `,
  ).run(
    id,
    input.sessionId,
    input.eventType,
    input.content ?? null,
    input.metadata ? JSON.stringify(input.metadata) : null,
  );

  const row = db.prepare("SELECT * FROM session_events WHERE id = ?").get(id) as SessionEventRow | undefined;

  if (!row) {
    throw new Error("Failed to log session event.");
  }

  return toSessionEvent(row);
}

export function updateSessionDetails(input: {
  sessionId: string;
  endedAt?: string | null;
  durationMinutes?: number | null;
  summary?: string | null;
  topicsCovered?: string[] | null;
  performanceNotes?: string | null;
  apiCostCents?: number | null;
}) {
  const db = getDb();

  db.prepare(
    `
    UPDATE sessions
    SET
      ended_at = COALESCE(@ended_at, ended_at),
      duration_minutes = COALESCE(@duration_minutes, duration_minutes),
      summary = COALESCE(@summary, summary),
      topics_covered = COALESCE(@topics_covered, topics_covered),
      performance_notes = COALESCE(@performance_notes, performance_notes),
      api_cost_cents = COALESCE(@api_cost_cents, api_cost_cents)
    WHERE id = @session_id
  `,
  ).run({
    session_id: input.sessionId,
    ended_at: input.endedAt ?? null,
    duration_minutes: input.durationMinutes ?? null,
    summary: input.summary ?? null,
    topics_covered: input.topicsCovered ? JSON.stringify(input.topicsCovered) : null,
    performance_notes: input.performanceNotes ?? null,
    api_cost_cents: input.apiCostCents ?? null,
  });

  return getSessionById(input.sessionId);
}

export function applySkillUpdates(studentId: string, updates: SkillUpdateInput[]) {
  const db = getDb();
  const selectExisting = db.prepare(
    "SELECT * FROM skill_progress WHERE student_id = ? AND standard_code = ?",
  );
  const insertProgress = db.prepare(`
    INSERT INTO skill_progress (
      id,
      student_id,
      standard_code,
      standard_name,
      mastery_level,
      attempts,
      last_practiced
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  const updateProgress = db.prepare(`
    UPDATE skill_progress
    SET
      standard_name = COALESCE(@standard_name, standard_name),
      mastery_level = @mastery_level,
      attempts = @attempts,
      last_practiced = datetime('now')
    WHERE student_id = @student_id AND standard_code = @standard_code
  `);

  const transaction = db.transaction((entries: SkillUpdateInput[]) => {
    for (const entry of entries) {
      const existing = selectExisting.get(studentId, entry.standardCode) as SkillProgressRow | undefined;
      const attemptsDelta = Math.max(0, entry.attemptsDelta ?? 0);

      if (!existing) {
        insertProgress.run(
          uuidv4(),
          studentId,
          entry.standardCode,
          entry.standardName ?? null,
          Math.max(0, Math.min(100, entry.masteryLevel ?? 0)),
          attemptsDelta,
        );
        continue;
      }

      updateProgress.run({
        student_id: studentId,
        standard_code: entry.standardCode,
        standard_name: entry.standardName ?? null,
        mastery_level: Math.max(
          0,
          Math.min(100, entry.masteryLevel ?? existing.mastery_level),
        ),
        attempts: existing.attempts + attemptsDelta,
      });
    }
  });

  transaction(updates);
  return getStudentProgress(studentId);
}
