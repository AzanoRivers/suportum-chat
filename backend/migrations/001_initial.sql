PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    api_key     TEXT NOT NULL UNIQUE,
    slug        TEXT NOT NULL UNIQUE,
    settings    TEXT NOT NULL DEFAULT '{}',
    plan        TEXT NOT NULL DEFAULT 'free',
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    username    TEXT NOT NULL,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'client',
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE(project_id, email),
    UNIQUE(project_id, username)
);

CREATE TABLE IF NOT EXISTS messages (
    id           TEXT PRIMARY KEY,
    project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    room_id      TEXT NOT NULL,
    sender_id    TEXT NOT NULL REFERENCES users(id),
    content      TEXT NOT NULL DEFAULT '',
    content_type TEXT NOT NULL DEFAULT 'text',
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS attachments (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    message_id    TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    room_id       TEXT NOT NULL,
    filename      TEXT NOT NULL,
    original_name TEXT NOT NULL,
    size_bytes    INTEGER NOT NULL,
    width         INTEGER NOT NULL,
    height        INTEGER NOT NULL,
    url           TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS tickets (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'open',
    priority    TEXT NOT NULL DEFAULT 'normal',
    client_id   TEXT NOT NULL REFERENCES users(id),
    agent_id    TEXT REFERENCES users(id),
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS orders (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,
    title       TEXT NOT NULL,
    details     TEXT,
    status      TEXT NOT NULL DEFAULT 'pending',
    client_id   TEXT NOT NULL REFERENCES users(id),
    agent_id    TEXT REFERENCES users(id),
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_users_project         ON users(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_project_room ON messages(project_id, room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_attachments_project   ON attachments(project_id, message_id);
CREATE INDEX IF NOT EXISTS idx_tickets_project       ON tickets(project_id, status, agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_project        ON orders(project_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_api_key      ON projects(api_key);
