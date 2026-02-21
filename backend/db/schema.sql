CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    streak_count INTEGER DEFAULT 0,
    last_active_date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS graph_nodes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    concept_name TEXT NOT NULL,
    mastery_score REAL DEFAULT 0.0,
    mastery_tier TEXT DEFAULT 'unexplored',
    times_studied INTEGER DEFAULT 0,
    last_studied_at TEXT,
    subject TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS graph_edges (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    source_node_id TEXT NOT NULL,
    target_node_id TEXT NOT NULL,
    strength REAL DEFAULT 0.5,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (source_node_id) REFERENCES graph_nodes(id),
    FOREIGN KEY (target_node_id) REFERENCES graph_nodes(id)
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    topic TEXT NOT NULL,
    started_at TEXT DEFAULT (datetime('now')),
    ended_at TEXT,
    summary_json TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    graph_update_json TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    concept_node_id TEXT,
    score INTEGER,
    total INTEGER,
    difficulty TEXT,
    questions_json TEXT,
    answers_json TEXT,
    completed_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS quiz_context (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    concept_node_id TEXT NOT NULL,
    context_json TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (concept_node_id) REFERENCES graph_nodes(id),
    UNIQUE(user_id, concept_node_id)
);

CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    course_name TEXT,
    due_date TEXT NOT NULL,
    assignment_type TEXT,
    notes TEXT,
    google_event_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS room_members (
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (room_id, user_id),
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS room_activity (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    concept_name TEXT,
    detail TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS oauth_tokens (
    user_id TEXT PRIMARY KEY,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
