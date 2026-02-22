"""
social_cache_service.py
-----------------------
Persistent cache for AI-generated room summaries.

The cache is keyed by room_id.  A SHA-256 hash of the member mastery data
(the same text fed to Gemini) is stored alongside the summary so we can
detect when room members' knowledge has changed and the summary needs to be
regenerated.

Table: room_summaries  (defined in db/schema.sql)
  room_id     TEXT  PRIMARY KEY
  summary     TEXT  NOT NULL
  member_hash TEXT  NOT NULL
  updated_at  TEXT  DEFAULT (datetime('now'))

If the table doesn't exist yet (e.g., running against an old DB), it is
created automatically on first use — no manual migration required.
"""

import hashlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db.connection import get_conn


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _ensure_table(conn) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS room_summaries (
            room_id     TEXT PRIMARY KEY,
            summary     TEXT NOT NULL,
            member_hash TEXT NOT NULL,
            updated_at  TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (room_id) REFERENCES rooms(id)
        )
        """
    )


def _compute_hash(member_summaries: list[str]) -> str:
    """
    Deterministic hash of the member mastery lines.
    Sorted so member ordering doesn't cause spurious cache misses.
    Only the first 16 hex chars are stored — plenty for collision resistance
    at this scale.
    """
    joined = "\n".join(sorted(member_summaries))
    return hashlib.sha256(joined.encode()).hexdigest()[:16]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_cached_summary(room_id: str, member_summaries: list[str]) -> str | None:
    """
    Return the cached summary for *room_id* if the member mastery data
    matches what was used to produce it.  Returns None on a cache miss
    (no row, or data has changed since the last generation).
    """
    current_hash = _compute_hash(member_summaries)
    conn = get_conn()
    try:
        _ensure_table(conn)
        row = conn.execute(
            "SELECT summary, member_hash FROM room_summaries WHERE room_id = ?",
            (room_id,),
        ).fetchone()
    finally:
        conn.close()

    if row and row["member_hash"] == current_hash:
        return row["summary"]
    return None


def save_summary(room_id: str, member_summaries: list[str], summary: str) -> None:
    """
    Persist *summary* for *room_id*.  Upserts so the first write creates
    the row and subsequent writes update it in place.
    """
    current_hash = _compute_hash(member_summaries)
    conn = get_conn()
    try:
        _ensure_table(conn)
        conn.execute(
            """
            INSERT INTO room_summaries (room_id, summary, member_hash, updated_at)
            VALUES (?, ?, ?, datetime('now'))
            ON CONFLICT(room_id) DO UPDATE SET
                summary     = excluded.summary,
                member_hash = excluded.member_hash,
                updated_at  = excluded.updated_at
            """,
            (room_id, summary, current_hash),
        )
        conn.commit()
    finally:
        conn.close()


def invalidate(room_id: str) -> None:
    """
    Force-invalidate the cached summary for *room_id* (e.g., when a member
    joins or leaves the room).
    """
    conn = get_conn()
    try:
        _ensure_table(conn)
        conn.execute("DELETE FROM room_summaries WHERE room_id = ?", (room_id,))
        conn.commit()
    finally:
        conn.close()
