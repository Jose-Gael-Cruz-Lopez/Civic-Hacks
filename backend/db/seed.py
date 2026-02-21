"""
Seed the database with sample data.

Run whenever you want to (re)populate the DB:
    python3 db/seed.py

WARNING: Uses INSERT OR IGNORE — re-running won't duplicate rows,
but won't update changed values either. Delete sapling.db first
to do a full reset, then run init_db.py then seed.py.

Users:
  user_john  — John Doe   (CS major)   CS 101, CS 112, MA 121, MA 213
  user_maria — Maria Chen (CS major)   CS 101, CS 112, MA 121, MA 213
  user_alex  — Alex Rivera(Math major) MA 121, MA 213, CS 101
  user_priya — Priya Patel(Math major) MA 121, MA 213, CS 112

Shared classes per pair (all pairs share ≥ 2):
  John  ↔ Maria : CS 101, CS 112, MA 121      (3)
  John  ↔ Alex  : CS 101, MA 121, MA 213      (3)
  John  ↔ Priya : CS 112, MA 121, MA 213      (3)
  Maria ↔ Alex  : CS 101, MA 121, MA 213      (3)
  Maria ↔ Priya : CS 112, MA 121, MA 213      (3)
  Alex  ↔ Priya : MA 121, MA 213              (2)
"""
import sqlite3
import uuid
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATABASE_PATH, get_mastery_tier


def get_conn():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ─── Users ────────────────────────────────────────────────────────────────────

USERS = [
    ("user_john",  "John Doe",    "john@example.com",  8,  "CS major"),
    ("user_maria", "Maria Chen",  "maria@example.com", 5,  "CS major"),
    ("user_alex",  "Alex Rivera", "alex@example.com",  7,  "Math major"),
    ("user_priya", "Priya Patel", "priya@example.com", 3,  "Math major"),
]


def seed_users():
    conn = get_conn()
    for uid, name, email, streak, _ in USERS:
        conn.execute(
            "INSERT OR IGNORE INTO users (id, name, email, streak_count) VALUES (?, ?, ?, ?)",
            (uid, name, email, streak),
        )
    conn.commit()
    conn.close()
    print("Users seeded.")


# ─── Knowledge graphs ─────────────────────────────────────────────────────────

def seed_graph(user_id: str, nodes_data: list, edges_data: list):
    conn = get_conn()
    name_to_id = {}
    for n in nodes_data:
        nid = str(uuid.uuid4())
        name_to_id[n["concept_name"]] = nid
        conn.execute(
            "INSERT OR IGNORE INTO graph_nodes "
            "(id, user_id, concept_name, mastery_score, mastery_tier, subject) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (nid, user_id, n["concept_name"], n["mastery_score"],
             get_mastery_tier(n["mastery_score"]), n["subject"]),
        )
    for e in edges_data:
        src = name_to_id.get(e["source"])
        tgt = name_to_id.get(e["target"])
        if src and tgt:
            conn.execute(
                "INSERT OR IGNORE INTO graph_edges "
                "(id, user_id, source_node_id, target_node_id, strength) "
                "VALUES (?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), user_id, src, tgt, e["strength"]),
            )
    conn.commit()
    conn.close()
    print(f"Graph seeded for {user_id}.")


# John Doe — CS major, halfway through Spring 2026
JOHN_NODES = [
    # CS 101
    {"concept_name": "Variables & Data Types",      "subject": "CS 101", "mastery_score": 0.92},
    {"concept_name": "Control Flow",                "subject": "CS 101", "mastery_score": 0.85},
    {"concept_name": "Functions",                   "subject": "CS 101", "mastery_score": 0.68},
    {"concept_name": "Recursion",                   "subject": "CS 101", "mastery_score": 0.32},
    {"concept_name": "Arrays & Lists",              "subject": "CS 101", "mastery_score": 0.55},
    {"concept_name": "Object-Oriented Programming", "subject": "CS 101", "mastery_score": 0.0},
    # CS 112
    {"concept_name": "Complexity Analysis",         "subject": "CS 112", "mastery_score": 0.78},
    {"concept_name": "Stacks & Queues",             "subject": "CS 112", "mastery_score": 0.62},
    {"concept_name": "Linked Lists",                "subject": "CS 112", "mastery_score": 0.38},
    {"concept_name": "Binary Trees",                "subject": "CS 112", "mastery_score": 0.0},
    {"concept_name": "Hash Tables",                 "subject": "CS 112", "mastery_score": 0.0},
    # MA 121
    {"concept_name": "Limits",                      "subject": "MA 121", "mastery_score": 0.88},
    {"concept_name": "Continuity",                  "subject": "MA 121", "mastery_score": 0.80},
    {"concept_name": "Basic Derivatives",           "subject": "MA 121", "mastery_score": 0.65},
    {"concept_name": "Product & Quotient Rule",     "subject": "MA 121", "mastery_score": 0.50},
    {"concept_name": "Chain Rule",                  "subject": "MA 121", "mastery_score": 0.28},
    {"concept_name": "Related Rates",               "subject": "MA 121", "mastery_score": 0.0},
    {"concept_name": "Integration Basics",          "subject": "MA 121", "mastery_score": 0.0},
    # MA 213
    {"concept_name": "Descriptive Statistics",      "subject": "MA 213", "mastery_score": 0.90},
    {"concept_name": "Probability Basics",          "subject": "MA 213", "mastery_score": 0.58},
    {"concept_name": "Conditional Probability",     "subject": "MA 213", "mastery_score": 0.35},
    {"concept_name": "Random Variables",            "subject": "MA 213", "mastery_score": 0.0},
    {"concept_name": "Normal Distribution",         "subject": "MA 213", "mastery_score": 0.0},
]
JOHN_EDGES = [
    {"source": "Variables & Data Types",  "target": "Control Flow",               "strength": 0.9},
    {"source": "Control Flow",            "target": "Functions",                  "strength": 0.85},
    {"source": "Functions",              "target": "Recursion",                   "strength": 0.8},
    {"source": "Arrays & Lists",         "target": "Object-Oriented Programming", "strength": 0.6},
    {"source": "Arrays & Lists",         "target": "Complexity Analysis",         "strength": 0.8},
    {"source": "Complexity Analysis",    "target": "Stacks & Queues",             "strength": 0.75},
    {"source": "Stacks & Queues",        "target": "Linked Lists",                "strength": 0.7},
    {"source": "Linked Lists",           "target": "Binary Trees",                "strength": 0.65},
    {"source": "Linked Lists",           "target": "Hash Tables",                 "strength": 0.6},
    {"source": "Limits",                 "target": "Continuity",                  "strength": 0.9},
    {"source": "Continuity",             "target": "Basic Derivatives",           "strength": 0.85},
    {"source": "Basic Derivatives",      "target": "Product & Quotient Rule",     "strength": 0.8},
    {"source": "Product & Quotient Rule","target": "Chain Rule",                  "strength": 0.75},
    {"source": "Chain Rule",             "target": "Related Rates",               "strength": 0.7},
    {"source": "Basic Derivatives",      "target": "Integration Basics",          "strength": 0.65},
    {"source": "Descriptive Statistics", "target": "Probability Basics",          "strength": 0.85},
    {"source": "Probability Basics",     "target": "Conditional Probability",     "strength": 0.8},
    {"source": "Conditional Probability","target": "Random Variables",            "strength": 0.75},
    {"source": "Random Variables",       "target": "Normal Distribution",         "strength": 0.7},
]

# Maria Chen — CS major, strong in CS, lighter in math
MARIA_NODES = [
    # CS 101
    {"concept_name": "Variables & Data Types",      "subject": "CS 101", "mastery_score": 0.95},
    {"concept_name": "Control Flow",                "subject": "CS 101", "mastery_score": 0.90},
    {"concept_name": "Functions",                   "subject": "CS 101", "mastery_score": 0.85},
    {"concept_name": "Recursion",                   "subject": "CS 101", "mastery_score": 0.70},
    {"concept_name": "Arrays & Lists",              "subject": "CS 101", "mastery_score": 0.80},
    {"concept_name": "Object-Oriented Programming", "subject": "CS 101", "mastery_score": 0.55},
    # CS 112
    {"concept_name": "Complexity Analysis",         "subject": "CS 112", "mastery_score": 0.88},
    {"concept_name": "Stacks & Queues",             "subject": "CS 112", "mastery_score": 0.75},
    {"concept_name": "Linked Lists",                "subject": "CS 112", "mastery_score": 0.60},
    {"concept_name": "Binary Trees",                "subject": "CS 112", "mastery_score": 0.30},
    {"concept_name": "Hash Tables",                 "subject": "CS 112", "mastery_score": 0.0},
    # MA 121
    {"concept_name": "Limits",                      "subject": "MA 121", "mastery_score": 0.55},
    {"concept_name": "Continuity",                  "subject": "MA 121", "mastery_score": 0.48},
    {"concept_name": "Basic Derivatives",           "subject": "MA 121", "mastery_score": 0.35},
    {"concept_name": "Chain Rule",                  "subject": "MA 121", "mastery_score": 0.15},
    # MA 213
    {"concept_name": "Descriptive Statistics",      "subject": "MA 213", "mastery_score": 0.65},
    {"concept_name": "Probability Basics",          "subject": "MA 213", "mastery_score": 0.45},
    {"concept_name": "Conditional Probability",     "subject": "MA 213", "mastery_score": 0.20},
]
MARIA_EDGES = [
    {"source": "Variables & Data Types",  "target": "Control Flow",               "strength": 0.9},
    {"source": "Control Flow",            "target": "Functions",                  "strength": 0.9},
    {"source": "Functions",              "target": "Recursion",                   "strength": 0.85},
    {"source": "Arrays & Lists",         "target": "Object-Oriented Programming", "strength": 0.7},
    {"source": "Arrays & Lists",         "target": "Complexity Analysis",         "strength": 0.85},
    {"source": "Complexity Analysis",    "target": "Stacks & Queues",             "strength": 0.8},
    {"source": "Stacks & Queues",        "target": "Linked Lists",                "strength": 0.75},
    {"source": "Linked Lists",           "target": "Binary Trees",                "strength": 0.5},
    {"source": "Limits",                 "target": "Continuity",                  "strength": 0.7},
    {"source": "Continuity",             "target": "Basic Derivatives",           "strength": 0.6},
    {"source": "Basic Derivatives",      "target": "Chain Rule",                  "strength": 0.4},
    {"source": "Descriptive Statistics", "target": "Probability Basics",          "strength": 0.7},
    {"source": "Probability Basics",     "target": "Conditional Probability",     "strength": 0.5},
]

# Alex Rivera — Math major, strong in calculus & stats, building CS
ALEX_NODES = [
    # MA 121
    {"concept_name": "Limits",                  "subject": "MA 121", "mastery_score": 0.95},
    {"concept_name": "Continuity",              "subject": "MA 121", "mastery_score": 0.92},
    {"concept_name": "Basic Derivatives",       "subject": "MA 121", "mastery_score": 0.88},
    {"concept_name": "Product & Quotient Rule", "subject": "MA 121", "mastery_score": 0.82},
    {"concept_name": "Chain Rule",              "subject": "MA 121", "mastery_score": 0.75},
    {"concept_name": "Related Rates",           "subject": "MA 121", "mastery_score": 0.50},
    {"concept_name": "Integration Basics",      "subject": "MA 121", "mastery_score": 0.30},
    # MA 213
    {"concept_name": "Descriptive Statistics",  "subject": "MA 213", "mastery_score": 0.92},
    {"concept_name": "Probability Basics",      "subject": "MA 213", "mastery_score": 0.85},
    {"concept_name": "Conditional Probability", "subject": "MA 213", "mastery_score": 0.78},
    {"concept_name": "Random Variables",        "subject": "MA 213", "mastery_score": 0.55},
    {"concept_name": "Normal Distribution",     "subject": "MA 213", "mastery_score": 0.30},
    # CS 101
    {"concept_name": "Variables & Data Types",  "subject": "CS 101", "mastery_score": 0.65},
    {"concept_name": "Control Flow",            "subject": "CS 101", "mastery_score": 0.55},
    {"concept_name": "Functions",               "subject": "CS 101", "mastery_score": 0.40},
    {"concept_name": "Recursion",               "subject": "CS 101", "mastery_score": 0.15},
]
ALEX_EDGES = [
    {"source": "Limits",                 "target": "Continuity",             "strength": 0.95},
    {"source": "Continuity",             "target": "Basic Derivatives",      "strength": 0.9},
    {"source": "Basic Derivatives",      "target": "Product & Quotient Rule","strength": 0.85},
    {"source": "Product & Quotient Rule","target": "Chain Rule",             "strength": 0.8},
    {"source": "Chain Rule",             "target": "Related Rates",          "strength": 0.7},
    {"source": "Basic Derivatives",      "target": "Integration Basics",     "strength": 0.6},
    {"source": "Descriptive Statistics", "target": "Probability Basics",     "strength": 0.9},
    {"source": "Probability Basics",     "target": "Conditional Probability","strength": 0.85},
    {"source": "Conditional Probability","target": "Random Variables",       "strength": 0.8},
    {"source": "Random Variables",       "target": "Normal Distribution",    "strength": 0.7},
    {"source": "Variables & Data Types", "target": "Control Flow",           "strength": 0.75},
    {"source": "Control Flow",           "target": "Functions",              "strength": 0.65},
    {"source": "Functions",              "target": "Recursion",              "strength": 0.4},
]

# Priya Patel — Math major, strong in stats & calc, lighter in CS
PRIYA_NODES = [
    # MA 121
    {"concept_name": "Limits",                  "subject": "MA 121", "mastery_score": 0.90},
    {"concept_name": "Continuity",              "subject": "MA 121", "mastery_score": 0.85},
    {"concept_name": "Basic Derivatives",       "subject": "MA 121", "mastery_score": 0.78},
    {"concept_name": "Product & Quotient Rule", "subject": "MA 121", "mastery_score": 0.60},
    {"concept_name": "Chain Rule",              "subject": "MA 121", "mastery_score": 0.45},
    {"concept_name": "Related Rates",           "subject": "MA 121", "mastery_score": 0.15},
    # MA 213
    {"concept_name": "Descriptive Statistics",  "subject": "MA 213", "mastery_score": 0.95},
    {"concept_name": "Probability Basics",      "subject": "MA 213", "mastery_score": 0.88},
    {"concept_name": "Conditional Probability", "subject": "MA 213", "mastery_score": 0.72},
    {"concept_name": "Random Variables",        "subject": "MA 213", "mastery_score": 0.50},
    {"concept_name": "Normal Distribution",     "subject": "MA 213", "mastery_score": 0.40},
    # CS 112
    {"concept_name": "Complexity Analysis",     "subject": "CS 112", "mastery_score": 0.55},
    {"concept_name": "Stacks & Queues",         "subject": "CS 112", "mastery_score": 0.40},
    {"concept_name": "Linked Lists",            "subject": "CS 112", "mastery_score": 0.20},
    {"concept_name": "Binary Trees",            "subject": "CS 112", "mastery_score": 0.0},
]
PRIYA_EDGES = [
    {"source": "Limits",                 "target": "Continuity",             "strength": 0.9},
    {"source": "Continuity",             "target": "Basic Derivatives",      "strength": 0.88},
    {"source": "Basic Derivatives",      "target": "Product & Quotient Rule","strength": 0.8},
    {"source": "Product & Quotient Rule","target": "Chain Rule",             "strength": 0.7},
    {"source": "Chain Rule",             "target": "Related Rates",          "strength": 0.5},
    {"source": "Descriptive Statistics", "target": "Probability Basics",     "strength": 0.92},
    {"source": "Probability Basics",     "target": "Conditional Probability","strength": 0.85},
    {"source": "Conditional Probability","target": "Random Variables",       "strength": 0.8},
    {"source": "Random Variables",       "target": "Normal Distribution",    "strength": 0.75},
    {"source": "Complexity Analysis",    "target": "Stacks & Queues",        "strength": 0.65},
    {"source": "Stacks & Queues",        "target": "Linked Lists",           "strength": 0.5},
    {"source": "Linked Lists",           "target": "Binary Trees",           "strength": 0.35},
]


# ─── Assignments (John only) ──────────────────────────────────────────────────

JOHN_ASSIGNMENTS = [
    {"title": "Lab 4: Functions & Scope",    "course_name": "CS 101",  "due_date": "2026-03-03", "assignment_type": "homework"},
    {"title": "Problem Set 5: Derivatives",  "course_name": "MA 121",  "due_date": "2026-03-05", "assignment_type": "homework"},
    {"title": "Lab 5: Linked Lists",         "course_name": "CS 112",  "due_date": "2026-03-07", "assignment_type": "homework"},
    {"title": "Stats Midterm",               "course_name": "MA 213",  "due_date": "2026-03-12", "assignment_type": "exam"},
    {"title": "Midterm Exam",                "course_name": "MA 121",  "due_date": "2026-03-14", "assignment_type": "exam"},
    {"title": "Programming Project 2",       "course_name": "CS 101",  "due_date": "2026-03-21", "assignment_type": "project"},
    {"title": "CS 112 Midterm",              "course_name": "CS 112",  "due_date": "2026-03-26", "assignment_type": "exam"},
    {"title": "Problem Set 6: Chain Rule",   "course_name": "MA 121",  "due_date": "2026-04-02", "assignment_type": "homework"},
    {"title": "Lab 6: Binary Trees",         "course_name": "CS 112",  "due_date": "2026-04-09", "assignment_type": "homework"},
    {"title": "Stats Problem Set 4",         "course_name": "MA 213",  "due_date": "2026-04-14", "assignment_type": "homework"},
    {"title": "Final Project",               "course_name": "CS 101",  "due_date": "2026-04-28", "assignment_type": "project"},
    {"title": "Final Exam",                  "course_name": "MA 121",  "due_date": "2026-05-08", "assignment_type": "exam"},
]


def seed_assignments(user_id: str, assignments: list):
    conn = get_conn()
    for a in assignments:
        conn.execute(
            "INSERT OR IGNORE INTO assignments "
            "(id, user_id, title, course_name, due_date, assignment_type, notes) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), user_id, a["title"], a["course_name"],
             a["due_date"], a["assignment_type"], a.get("notes")),
        )
    conn.commit()
    conn.close()
    print(f"Assignments seeded for {user_id}.")


# ─── Study room ───────────────────────────────────────────────────────────────

ROOM_ID      = "room_main"
ROOM_NAME    = "CS & Math Study Group"
ROOM_CODE    = "JDX7K2"
ROOM_MEMBERS = ["user_john", "user_maria", "user_alex", "user_priya"]

ROOM_ACTIVITY = [
    {"user": "user_maria", "type": "mastered",  "concept": "Functions",            "detail": "85%"},
    {"user": "user_alex",  "type": "mastered",  "concept": "Basic Derivatives",    "detail": "88%"},
    {"user": "user_john",  "type": "learned",   "concept": "Chain Rule",           "detail": "28%"},
    {"user": "user_maria", "type": "quizzed",   "concept": "Recursion",            "detail": "7/10"},
    {"user": "user_alex",  "type": "streak",    "concept": None,                   "detail": "7-day streak"},
    {"user": "user_john",  "type": "learned",   "concept": "Product & Quotient Rule","detail": "50%"},
    {"user": "user_priya", "type": "mastered",  "concept": "Probability Basics",   "detail": "88%"},
    {"user": "user_priya", "type": "joined",    "concept": None,                   "detail": "joined the room"},
    {"user": "user_maria", "type": "joined",    "concept": None,                   "detail": "joined the room"},
]


def seed_room():
    conn = get_conn()
    conn.execute(
        "INSERT OR IGNORE INTO rooms (id, name, invite_code, created_by) VALUES (?, ?, ?, ?)",
        (ROOM_ID, ROOM_NAME, ROOM_CODE, "user_john"),
    )
    for uid in ROOM_MEMBERS:
        conn.execute(
            "INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)",
            (ROOM_ID, uid),
        )
    for item in ROOM_ACTIVITY:
        conn.execute(
            "INSERT OR IGNORE INTO room_activity "
            "(id, room_id, user_id, activity_type, concept_name, detail) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), ROOM_ID, item["user"],
             item["type"], item.get("concept"), item.get("detail")),
        )
    # Set room_id on each user
    for uid in ROOM_MEMBERS:
        conn.execute(
            "UPDATE users SET room_id = ? WHERE id = ?", (ROOM_ID, uid)
        )
    conn.commit()
    conn.close()
    print(f"Room '{ROOM_NAME}' seeded with {len(ROOM_MEMBERS)} members.")


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Seeding users...")
    seed_users()
    print("Seeding graphs...")
    seed_graph("user_john",  JOHN_NODES,  JOHN_EDGES)
    seed_graph("user_maria", MARIA_NODES, MARIA_EDGES)
    seed_graph("user_alex",  ALEX_NODES,  ALEX_EDGES)
    seed_graph("user_priya", PRIYA_NODES, PRIYA_EDGES)
    print("Seeding assignments...")
    seed_assignments("user_john", JOHN_ASSIGNMENTS)
    print("Seeding room...")
    seed_room()
    print(f"\nDone! DB: {DATABASE_PATH}")
