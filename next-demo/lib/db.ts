import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "chat.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;

  // Ensure data directory exists
  const fs = require("fs");
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  _db.pragma("journal_mode = WAL");

  // Create tables
  _db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '新的对话',
      model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
      type TEXT NOT NULL DEFAULT 'chat' CHECK(type IN ('chat', 'agent')),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'tool')),
      content TEXT NOT NULL DEFAULT '',
      tool_name TEXT,
      tool_call_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conv_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
  `);

  // Migrate: add `type` column if it doesn't exist (for existing databases)
  const convCols = (_db.pragma("table_info(conversations)") as { name: string }[]).map((c) => c.name);
  if (!convCols.includes("type")) {
    _db.exec("ALTER TABLE conversations ADD COLUMN type TEXT NOT NULL DEFAULT 'chat' CHECK(type IN ('chat', 'agent'))");
  }

  // Migrate: add tool columns to messages if they don't exist
  const msgCols = (_db.pragma("table_info(messages)") as { name: string }[]).map((c) => c.name);
  if (!msgCols.includes("tool_name")) {
    _db.exec("ALTER TABLE messages ADD COLUMN tool_name TEXT");
  }
  if (!msgCols.includes("tool_call_id")) {
    _db.exec("ALTER TABLE messages ADD COLUMN tool_call_id TEXT");
  }

  return _db;
}

// --- Conversation operations ---

export type ConversationType = "chat" | "agent";

export interface ConversationRow {
  id: string;
  title: string;
  model: string;
  type: ConversationType;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  tool_name?: string;
  tool_call_id?: string;
  created_at: string;
}

export function listConversations(): ConversationRow[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, title, model, type, created_at, updated_at FROM conversations ORDER BY updated_at DESC"
    )
    .all() as ConversationRow[];
}

export function getConversation(id: string): ConversationRow | undefined {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, title, model, type, created_at, updated_at FROM conversations WHERE id = ?"
    )
    .get(id) as ConversationRow | undefined;
}

export function getConversationMessages(
  conversationId: string
): MessageRow[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, conversation_id, role, content, tool_name, tool_call_id, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
    )
    .all(conversationId) as MessageRow[];
}

export function createConversation(
  id: string,
  title: string = "新的对话",
  model: string = "gpt-4o-mini",
  type: ConversationType = "chat"
): ConversationRow {
  const db = getDb();
  db.prepare(
    "INSERT INTO conversations (id, title, model, type) VALUES (?, ?, ?, ?)"
  ).run(id, title, model, type);
  return getConversation(id)!;
}

export function updateConversationTitle(id: string, title: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE conversations SET title = ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
  ).run(title, id);
}

export function updateConversationModel(id: string, model: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE conversations SET model = ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
  ).run(model, id);
}

export function touchConversation(id: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE conversations SET updated_at = datetime('now', 'localtime') WHERE id = ?"
  ).run(id);
}

export function deleteConversation(id: string): boolean {
  const db = getDb();
  // Delete messages first (even though CASCADE should handle it)
  db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(id);
  const result = db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
  return result.changes > 0;
}

// --- Message operations ---

export function addMessage(
  id: string,
  conversationId: string,
  role: "user" | "assistant" | "tool",
  content: string,
  toolName?: string,
  toolCallId?: string
): MessageRow {
  const db = getDb();
  db.prepare(
    "INSERT INTO messages (id, conversation_id, role, content, tool_name, tool_call_id) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, conversationId, role, content, toolName ?? null, toolCallId ?? null);
  // Touch the conversation's updated_at
  touchConversation(conversationId);
  return db
    .prepare(
      "SELECT id, conversation_id, role, content, tool_name, tool_call_id, created_at FROM messages WHERE id = ?"
    )
    .get(id) as MessageRow;
}
