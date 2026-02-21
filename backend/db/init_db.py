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
        ("user_andres", "Andres", "andres@example.com", 5),
        ("user_maria", "Maria", "maria@example.com", 3),
        ("user_alex", "Alex", "alex@example.com", 7),
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
        user_id = user_map.get(item["user"], "user_andres")
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


ANDRES_NODES = [
    {"concept_name": "Vectors", "subject": "Linear Algebra", "mastery_score": 0.91, "mastery_tier": "mastered"},
    {"concept_name": "Matrices", "subject": "Linear Algebra", "mastery_score": 0.85, "mastery_tier": "mastered"},
    {"concept_name": "Determinants", "subject": "Linear Algebra", "mastery_score": 0.45, "mastery_tier": "struggling"},
    {"concept_name": "Eigenvalues", "subject": "Linear Algebra", "mastery_score": 0.65, "mastery_tier": "learning"},
    {"concept_name": "Eigenvectors", "subject": "Linear Algebra", "mastery_score": 0.0, "mastery_tier": "unexplored"},
    {"concept_name": "Cell Structure", "subject": "Biology", "mastery_score": 0.88, "mastery_tier": "mastered"},
    {"concept_name": "Photosynthesis", "subject": "Biology", "mastery_score": 0.72, "mastery_tier": "learning"},
    {"concept_name": "Calvin Cycle", "subject": "Biology", "mastery_score": 0.32, "mastery_tier": "struggling"},
    {"concept_name": "Cellular Respiration", "subject": "Biology", "mastery_score": 0.0, "mastery_tier": "unexplored"},
    {"concept_name": "Probability Basics", "subject": "CS 237", "mastery_score": 0.78, "mastery_tier": "learning"},
    {"concept_name": "Bayes Theorem", "subject": "CS 237", "mastery_score": 0.55, "mastery_tier": "learning"},
    {"concept_name": "Random Variables", "subject": "CS 237", "mastery_score": 0.20, "mastery_tier": "struggling"},
]
ANDRES_EDGES = [
    {"source": "Vectors", "target": "Matrices", "strength": 0.9},
    {"source": "Matrices", "target": "Determinants", "strength": 0.8},
    {"source": "Determinants", "target": "Eigenvalues", "strength": 0.7},
    {"source": "Eigenvalues", "target": "Eigenvectors", "strength": 0.6},
    {"source": "Cell Structure", "target": "Photosynthesis", "strength": 0.8},
    {"source": "Photosynthesis", "target": "Calvin Cycle", "strength": 0.7},
    {"source": "Photosynthesis", "target": "Cellular Respiration", "strength": 0.6},
    {"source": "Probability Basics", "target": "Bayes Theorem", "strength": 0.8},
    {"source": "Probability Basics", "target": "Random Variables", "strength": 0.7},
]

MARIA_NODES = [
    {"concept_name": "Vectors", "subject": "Linear Algebra", "mastery_score": 0.60, "mastery_tier": "learning"},
    {"concept_name": "Matrices", "subject": "Linear Algebra", "mastery_score": 0.50, "mastery_tier": "learning"},
    {"concept_name": "Determinants", "subject": "Linear Algebra", "mastery_score": 0.90, "mastery_tier": "mastered"},
    {"concept_name": "Eigenvalues", "subject": "Linear Algebra", "mastery_score": 0.30, "mastery_tier": "struggling"},
    {"concept_name": "Cell Structure", "subject": "Biology", "mastery_score": 0.95, "mastery_tier": "mastered"},
    {"concept_name": "Photosynthesis", "subject": "Biology", "mastery_score": 0.88, "mastery_tier": "mastered"},
    {"concept_name": "Calvin Cycle", "subject": "Biology", "mastery_score": 0.82, "mastery_tier": "mastered"},
    {"concept_name": "Cellular Respiration", "subject": "Biology", "mastery_score": 0.70, "mastery_tier": "learning"},
    {"concept_name": "Probability Basics", "subject": "CS 237", "mastery_score": 0.40, "mastery_tier": "struggling"},
    {"concept_name": "Bayes Theorem", "subject": "CS 237", "mastery_score": 0.25, "mastery_tier": "struggling"},
]
MARIA_EDGES = [
    {"source": "Vectors", "target": "Matrices", "strength": 0.7},
    {"source": "Matrices", "target": "Determinants", "strength": 0.9},
    {"source": "Determinants", "target": "Eigenvalues", "strength": 0.5},
    {"source": "Cell Structure", "target": "Photosynthesis", "strength": 0.9},
    {"source": "Photosynthesis", "target": "Calvin Cycle", "strength": 0.85},
    {"source": "Photosynthesis", "target": "Cellular Respiration", "strength": 0.7},
    {"source": "Probability Basics", "target": "Bayes Theorem", "strength": 0.5},
]

ALEX_NODES = [
    {"concept_name": "Vectors", "subject": "Linear Algebra", "mastery_score": 0.75, "mastery_tier": "learning"},
    {"concept_name": "Matrices", "subject": "Linear Algebra", "mastery_score": 0.70, "mastery_tier": "learning"},
    {"concept_name": "Determinants", "subject": "Linear Algebra", "mastery_score": 0.65, "mastery_tier": "learning"},
    {"concept_name": "Eigenvalues", "subject": "Linear Algebra", "mastery_score": 0.80, "mastery_tier": "mastered"},
    {"concept_name": "Eigenvectors", "subject": "Linear Algebra", "mastery_score": 0.72, "mastery_tier": "learning"},
    {"concept_name": "Probability Basics", "subject": "CS 237", "mastery_score": 0.92, "mastery_tier": "mastered"},
    {"concept_name": "Bayes Theorem", "subject": "CS 237", "mastery_score": 0.88, "mastery_tier": "mastered"},
    {"concept_name": "Random Variables", "subject": "CS 237", "mastery_score": 0.85, "mastery_tier": "mastered"},
]
ALEX_EDGES = [
    {"source": "Vectors", "target": "Matrices", "strength": 0.8},
    {"source": "Matrices", "target": "Determinants", "strength": 0.7},
    {"source": "Determinants", "target": "Eigenvalues", "strength": 0.8},
    {"source": "Eigenvalues", "target": "Eigenvectors", "strength": 0.85},
    {"source": "Probability Basics", "target": "Bayes Theorem", "strength": 0.9},
    {"source": "Probability Basics", "target": "Random Variables", "strength": 0.9},
    {"source": "Bayes Theorem", "target": "Random Variables", "strength": 0.8},
]

ASSIGNMENTS = [
    {"title": "Problem Set 3", "course_name": "CS 210", "due_date": "2026-02-24", "assignment_type": "homework"},
    {"title": "Quiz: Eigenvalues", "course_name": "MA 242", "due_date": "2026-02-26", "assignment_type": "exam"},
    {"title": "Case Study Analysis", "course_name": "QST SM 275", "due_date": "2026-03-01", "assignment_type": "project"},
    {"title": "Probability Problem Set 4", "course_name": "CS 237", "due_date": "2026-03-03", "assignment_type": "homework"},
    {"title": "Midterm Exam", "course_name": "CS 237", "due_date": "2026-03-10", "assignment_type": "exam"},
    {"title": "Systems Programming Lab", "course_name": "CS 210", "due_date": "2026-03-05", "assignment_type": "homework"},
]

ROOM_ACTIVITY = [
    {"user": "Maria", "type": "mastered", "concept": "Calvin Cycle", "detail": "82%"},
    {"user": "Alex", "type": "quizzed", "concept": "Bayes Theorem", "detail": "9/10"},
    {"user": "Maria", "type": "learned", "concept": "Cellular Respiration", "detail": "70%"},
    {"user": "Alex", "type": "streak", "concept": None, "detail": "7-day streak"},
    {"user": "Andres", "type": "learned", "concept": "Eigenvalues", "detail": "65%"},
    {"user": "Maria", "type": "joined", "concept": None, "detail": "joined the room"},
    {"user": "Alex", "type": "mastered", "concept": "Random Variables", "detail": "85%"},
]


if __name__ == "__main__":
    print("Initializing database...")
    init_db()
    print("Seeding users...")
    seed_users()
    print("Seeding graphs...")
    seed_graph("user_andres", ANDRES_NODES, ANDRES_EDGES)
    seed_graph("user_maria", MARIA_NODES, MARIA_EDGES)
    seed_graph("user_alex", ALEX_NODES, ALEX_EDGES)
    print("Seeding assignments...")
    seed_assignments("user_andres", ASSIGNMENTS)
    print("Seeding room...")
    seed_room("room_cs237", "CS 237 Study Group", "SAP42X", "user_andres",
              ["user_andres", "user_maria", "user_alex"])
    user_map = {"Andres": "user_andres", "Maria": "user_maria", "Alex": "user_alex"}
    seed_room_activity("room_cs237", ROOM_ACTIVITY, user_map)
    print(f"Done! Database at: {DATABASE_PATH}")
