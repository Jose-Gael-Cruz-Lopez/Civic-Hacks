import sqlite3
import uuid
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATABASE_PATH, get_mastery_tier

SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


def get_conn():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    with open(SCHEMA_PATH) as f:
        conn.executescript(f.read())
    conn.commit()
    conn.close()
    print("Schema initialized.")


def seed_users():
    conn = get_conn()
    users = [
        ("user_john",  "John Doe", "john@example.com",  8),
        ("user_maria", "Maria",    "maria@example.com",  3),
        ("user_alex",  "Alex",     "alex@example.com",   7),
    ]
    for uid, name, email, streak in users:
        conn.execute(
            "INSERT OR IGNORE INTO users (id, name, email, streak_count) VALUES (?, ?, ?, ?)",
            (uid, name, email, streak),
        )
    conn.commit()
    conn.close()
    print("Users seeded.")


def seed_graph(user_id: str, nodes_data: list, edges_data: list):
    conn = get_conn()
    node_name_to_id = {}
    for n in nodes_data:
        node_id = str(uuid.uuid4())
        node_name_to_id[n["concept_name"]] = node_id
        conn.execute(
            "INSERT OR IGNORE INTO graph_nodes (id, user_id, concept_name, mastery_score, mastery_tier, subject) VALUES (?, ?, ?, ?, ?, ?)",
            (node_id, user_id, n["concept_name"], n["mastery_score"], n["mastery_tier"], n["subject"]),
        )
    for e in edges_data:
        src = node_name_to_id.get(e["source"])
        tgt = node_name_to_id.get(e["target"])
        if src and tgt:
            eid = str(uuid.uuid4())
            conn.execute(
                "INSERT OR IGNORE INTO graph_edges (id, user_id, source_node_id, target_node_id, strength) VALUES (?, ?, ?, ?, ?)",
                (eid, user_id, src, tgt, e["strength"]),
            )
    conn.commit()
    conn.close()
    print(f"Graph seeded for {user_id}.")


def seed_room(room_id, name, invite_code, created_by, member_ids):
    conn = get_conn()
    conn.execute(
        "INSERT OR IGNORE INTO rooms (id, name, invite_code, created_by) VALUES (?, ?, ?, ?)",
        (room_id, name, invite_code, created_by),
    )
    for uid in member_ids:
        conn.execute("INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)", (room_id, uid))
    conn.commit()
    conn.close()
    print("Room seeded.")


def seed_room_activity(room_id: str, activity_items: list, user_map: dict):
    conn = get_conn()
    for item in activity_items:
        act_id = str(uuid.uuid4())
        user_id = user_map.get(item["user"], "user_john")
        conn.execute(
            "INSERT OR IGNORE INTO room_activity (id, room_id, user_id, activity_type, concept_name, detail) VALUES (?, ?, ?, ?, ?, ?)",
            (act_id, room_id, user_id, item["type"], item.get("concept"), item.get("detail")),
        )
    conn.commit()
    conn.close()
    print("Room activity seeded.")


def seed_assignments(user_id: str, assignments: list):
    conn = get_conn()
    for a in assignments:
        aid = str(uuid.uuid4())
        conn.execute(
            "INSERT OR IGNORE INTO assignments (id, user_id, title, course_name, due_date, assignment_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (aid, user_id, a["title"], a["course_name"], a["due_date"], a["assignment_type"], a.get("notes")),
        )
    conn.commit()
    conn.close()
    print("Assignments seeded.")


# ── John Doe — halfway through Spring 2026 semester ───────────────────────────
# Courses: Intro to CS (CS 101), Calculus 1 (MA 121),
#          Data Structures (CS 112), Statistics (MA 213)
# Weeks 1–8 done, weeks 9–16 mostly unexplored

JOHN_NODES = [
    # CS 101 — Intro to Computer Science
    {"concept_name": "Variables & Data Types",   "subject": "CS 101", "mastery_score": 0.92, "mastery_tier": "mastered"},
    {"concept_name": "Control Flow",             "subject": "CS 101", "mastery_score": 0.85, "mastery_tier": "mastered"},
    {"concept_name": "Functions",                "subject": "CS 101", "mastery_score": 0.68, "mastery_tier": "learning"},
    {"concept_name": "Recursion",                "subject": "CS 101", "mastery_score": 0.32, "mastery_tier": "struggling"},
    {"concept_name": "Arrays & Lists",           "subject": "CS 101", "mastery_score": 0.55, "mastery_tier": "learning"},
    {"concept_name": "Object-Oriented Programming", "subject": "CS 101", "mastery_score": 0.0, "mastery_tier": "unexplored"},

    # MA 121 — Calculus 1
    {"concept_name": "Limits",                   "subject": "MA 121", "mastery_score": 0.88, "mastery_tier": "mastered"},
    {"concept_name": "Continuity",               "subject": "MA 121", "mastery_score": 0.80, "mastery_tier": "mastered"},
    {"concept_name": "Basic Derivatives",        "subject": "MA 121", "mastery_score": 0.65, "mastery_tier": "learning"},
    {"concept_name": "Product & Quotient Rule",  "subject": "MA 121", "mastery_score": 0.50, "mastery_tier": "learning"},
    {"concept_name": "Chain Rule",               "subject": "MA 121", "mastery_score": 0.28, "mastery_tier": "struggling"},
    {"concept_name": "Related Rates",            "subject": "MA 121", "mastery_score": 0.0,  "mastery_tier": "unexplored"},
    {"concept_name": "Integration Basics",       "subject": "MA 121", "mastery_score": 0.0,  "mastery_tier": "unexplored"},

    # CS 112 — Data Structures
    {"concept_name": "Complexity Analysis",      "subject": "CS 112", "mastery_score": 0.78, "mastery_tier": "learning"},
    {"concept_name": "Stacks & Queues",          "subject": "CS 112", "mastery_score": 0.62, "mastery_tier": "learning"},
    {"concept_name": "Linked Lists",             "subject": "CS 112", "mastery_score": 0.38, "mastery_tier": "struggling"},
    {"concept_name": "Binary Trees",             "subject": "CS 112", "mastery_score": 0.0,  "mastery_tier": "unexplored"},
    {"concept_name": "Hash Tables",              "subject": "CS 112", "mastery_score": 0.0,  "mastery_tier": "unexplored"},

    # MA 213 — Statistics
    {"concept_name": "Descriptive Statistics",   "subject": "MA 213", "mastery_score": 0.90, "mastery_tier": "mastered"},
    {"concept_name": "Probability Basics",       "subject": "MA 213", "mastery_score": 0.58, "mastery_tier": "learning"},
    {"concept_name": "Conditional Probability",  "subject": "MA 213", "mastery_score": 0.35, "mastery_tier": "struggling"},
    {"concept_name": "Random Variables",         "subject": "MA 213", "mastery_score": 0.0,  "mastery_tier": "unexplored"},
    {"concept_name": "Normal Distribution",      "subject": "MA 213", "mastery_score": 0.0,  "mastery_tier": "unexplored"},
]

JOHN_EDGES = [
    # CS 101
    {"source": "Variables & Data Types",  "target": "Control Flow",               "strength": 0.9},
    {"source": "Control Flow",            "target": "Functions",                  "strength": 0.85},
    {"source": "Functions",               "target": "Recursion",                  "strength": 0.8},
    {"source": "Arrays & Lists",          "target": "Object-Oriented Programming","strength": 0.6},
    # MA 121
    {"source": "Limits",                  "target": "Continuity",                 "strength": 0.9},
    {"source": "Continuity",              "target": "Basic Derivatives",          "strength": 0.85},
    {"source": "Basic Derivatives",       "target": "Product & Quotient Rule",    "strength": 0.8},
    {"source": "Product & Quotient Rule", "target": "Chain Rule",                 "strength": 0.75},
    {"source": "Chain Rule",              "target": "Related Rates",              "strength": 0.7},
    {"source": "Basic Derivatives",       "target": "Integration Basics",         "strength": 0.65},
    # CS 112
    {"source": "Arrays & Lists",          "target": "Complexity Analysis",        "strength": 0.8},
    {"source": "Complexity Analysis",     "target": "Stacks & Queues",            "strength": 0.75},
    {"source": "Stacks & Queues",         "target": "Linked Lists",               "strength": 0.7},
    {"source": "Linked Lists",            "target": "Binary Trees",               "strength": 0.65},
    {"source": "Linked Lists",            "target": "Hash Tables",                "strength": 0.6},
    # MA 213
    {"source": "Descriptive Statistics",  "target": "Probability Basics",         "strength": 0.85},
    {"source": "Probability Basics",      "target": "Conditional Probability",    "strength": 0.8},
    {"source": "Conditional Probability", "target": "Random Variables",           "strength": 0.75},
    {"source": "Random Variables",        "target": "Normal Distribution",        "strength": 0.7},
]

# Maria — strong in CS, weaker in math
MARIA_NODES = [
    {"concept_name": "Variables & Data Types",   "subject": "CS 101", "mastery_score": 0.95, "mastery_tier": "mastered"},
    {"concept_name": "Control Flow",             "subject": "CS 101", "mastery_score": 0.90, "mastery_tier": "mastered"},
    {"concept_name": "Functions",                "subject": "CS 101", "mastery_score": 0.85, "mastery_tier": "mastered"},
    {"concept_name": "Recursion",                "subject": "CS 101", "mastery_score": 0.70, "mastery_tier": "learning"},
    {"concept_name": "Limits",                   "subject": "MA 121", "mastery_score": 0.50, "mastery_tier": "learning"},
    {"concept_name": "Basic Derivatives",        "subject": "MA 121", "mastery_score": 0.30, "mastery_tier": "struggling"},
    {"concept_name": "Complexity Analysis",      "subject": "CS 112", "mastery_score": 0.88, "mastery_tier": "mastered"},
    {"concept_name": "Stacks & Queues",          "subject": "CS 112", "mastery_score": 0.75, "mastery_tier": "learning"},
    {"concept_name": "Descriptive Statistics",   "subject": "MA 213", "mastery_score": 0.60, "mastery_tier": "learning"},
    {"concept_name": "Probability Basics",       "subject": "MA 213", "mastery_score": 0.40, "mastery_tier": "struggling"},
]
MARIA_EDGES = [
    {"source": "Variables & Data Types", "target": "Control Flow",          "strength": 0.9},
    {"source": "Control Flow",           "target": "Functions",             "strength": 0.9},
    {"source": "Functions",              "target": "Recursion",             "strength": 0.8},
    {"source": "Limits",                 "target": "Basic Derivatives",     "strength": 0.6},
    {"source": "Complexity Analysis",    "target": "Stacks & Queues",       "strength": 0.85},
    {"source": "Descriptive Statistics", "target": "Probability Basics",    "strength": 0.7},
]

# Alex — strong in math, still building CS
ALEX_NODES = [
    {"concept_name": "Limits",                   "subject": "MA 121", "mastery_score": 0.95, "mastery_tier": "mastered"},
    {"concept_name": "Continuity",               "subject": "MA 121", "mastery_score": 0.92, "mastery_tier": "mastered"},
    {"concept_name": "Basic Derivatives",        "subject": "MA 121", "mastery_score": 0.88, "mastery_tier": "mastered"},
    {"concept_name": "Chain Rule",               "subject": "MA 121", "mastery_score": 0.75, "mastery_tier": "learning"},
    {"concept_name": "Variables & Data Types",   "subject": "CS 101", "mastery_score": 0.70, "mastery_tier": "learning"},
    {"concept_name": "Control Flow",             "subject": "CS 101", "mastery_score": 0.60, "mastery_tier": "learning"},
    {"concept_name": "Functions",                "subject": "CS 101", "mastery_score": 0.40, "mastery_tier": "struggling"},
    {"concept_name": "Descriptive Statistics",   "subject": "MA 213", "mastery_score": 0.92, "mastery_tier": "mastered"},
    {"concept_name": "Probability Basics",       "subject": "MA 213", "mastery_score": 0.85, "mastery_tier": "mastered"},
    {"concept_name": "Conditional Probability",  "subject": "MA 213", "mastery_score": 0.78, "mastery_tier": "learning"},
]
ALEX_EDGES = [
    {"source": "Limits",                  "target": "Continuity",           "strength": 0.9},
    {"source": "Continuity",              "target": "Basic Derivatives",    "strength": 0.9},
    {"source": "Basic Derivatives",       "target": "Chain Rule",           "strength": 0.85},
    {"source": "Variables & Data Types",  "target": "Control Flow",         "strength": 0.8},
    {"source": "Control Flow",            "target": "Functions",            "strength": 0.7},
    {"source": "Descriptive Statistics",  "target": "Probability Basics",   "strength": 0.9},
    {"source": "Probability Basics",      "target": "Conditional Probability", "strength": 0.85},
]

# Assignments — halfway through Spring 2026 (due mid-March → late April)
JOHN_ASSIGNMENTS = [
    {"title": "Lab 4: Functions & Scope",        "course_name": "CS 101",  "due_date": "2026-03-03", "assignment_type": "homework"},
    {"title": "Problem Set 5: Derivatives",      "course_name": "MA 121",  "due_date": "2026-03-05", "assignment_type": "homework"},
    {"title": "Lab 5: Linked Lists",             "course_name": "CS 112",  "due_date": "2026-03-07", "assignment_type": "homework"},
    {"title": "Stats Midterm",                   "course_name": "MA 213",  "due_date": "2026-03-12", "assignment_type": "exam"},
    {"title": "Midterm Exam",                    "course_name": "MA 121",  "due_date": "2026-03-14", "assignment_type": "exam"},
    {"title": "Programming Project 2",          "course_name": "CS 101",  "due_date": "2026-03-21", "assignment_type": "project"},
    {"title": "CS 112 Midterm",                  "course_name": "CS 112",  "due_date": "2026-03-26", "assignment_type": "exam"},
    {"title": "Problem Set 6: Chain Rule",       "course_name": "MA 121",  "due_date": "2026-04-02", "assignment_type": "homework"},
    {"title": "Lab 6: Binary Trees",             "course_name": "CS 112",  "due_date": "2026-04-09", "assignment_type": "homework"},
    {"title": "Stats Problem Set 4",             "course_name": "MA 213",  "due_date": "2026-04-14", "assignment_type": "homework"},
    {"title": "Final Project",                   "course_name": "CS 101",  "due_date": "2026-04-28", "assignment_type": "project"},
    {"title": "Final Exam",                      "course_name": "MA 121",  "due_date": "2026-05-08", "assignment_type": "exam"},
]

ROOM_ACTIVITY = [
    {"user": "Maria",  "type": "mastered",  "concept": "Functions",            "detail": "85%"},
    {"user": "Alex",   "type": "mastered",  "concept": "Basic Derivatives",    "detail": "88%"},
    {"user": "John",   "type": "learned",   "concept": "Chain Rule",           "detail": "28%"},
    {"user": "Maria",  "type": "quizzed",   "concept": "Recursion",            "detail": "7/10"},
    {"user": "Alex",   "type": "streak",    "concept": None,                   "detail": "7-day streak"},
    {"user": "John",   "type": "learned",   "concept": "Product & Quotient Rule", "detail": "50%"},
    {"user": "Alex",   "type": "mastered",  "concept": "Probability Basics",   "detail": "85%"},
    {"user": "Maria",  "type": "joined",    "concept": None,                   "detail": "joined the room"},
]


if __name__ == "__main__":
    print("Initializing database...")
    init_db()
    print("Seeding users...")
    seed_users()
    print("Seeding graphs...")
    seed_graph("user_john",  JOHN_NODES,  JOHN_EDGES)
    seed_graph("user_maria", MARIA_NODES, MARIA_EDGES)
    seed_graph("user_alex",  ALEX_NODES,  ALEX_EDGES)
    print("Seeding assignments...")
    seed_assignments("user_john", JOHN_ASSIGNMENTS)
    print("Seeding room...")
    seed_room("room_cs101", "CS 101 Study Group", "JDX7K2", "user_john",
              ["user_john", "user_maria", "user_alex"])
    user_map = {"John": "user_john", "Maria": "user_maria", "Alex": "user_alex"}
    seed_room_activity("room_cs101", ROOM_ACTIVITY, user_map)
    print(f"Done! Database at: {DATABASE_PATH}")
