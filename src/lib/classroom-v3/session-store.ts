import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

const db = getDb();

db.exec(`
  CREATE TABLE IF NOT EXISTS classroom_v3_sessions (
    id TEXT PRIMARY KEY,
    topic TEXT,
    grade_level INTEGER,
    started_at TEXT,
    ended_at TEXT
  );
  CREATE TABLE IF NOT EXISTS classroom_v3_events (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    type TEXT,
    data TEXT,
    created_at TEXT
  );
`);

const insertSession = db.prepare(
  `INSERT INTO classroom_v3_sessions (id, topic, grade_level, started_at) VALUES (?, ?, ?, ?)`
);

const insertEvent = db.prepare(
  `INSERT INTO classroom_v3_events (id, session_id, type, data, created_at) VALUES (?, ?, ?, ?, ?)`
);

export function createSession(topic: string, gradeLevel: number): string {
  const id = uuidv4();
  insertSession.run(id, topic, gradeLevel, new Date().toISOString());
  return id;
}

export function logEvent(sessionId: string, type: string, data: object): void {
  insertEvent.run(
    uuidv4(),
    sessionId,
    type,
    JSON.stringify(data),
    new Date().toISOString()
  );
}
