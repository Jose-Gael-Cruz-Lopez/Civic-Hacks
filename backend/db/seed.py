"""
Seed the database with sample data.

Run whenever you want to (re)populate the DB:
    python3 db/seed.py

WARNING: Uses INSERT OR IGNORE — re-running won't duplicate rows,
but won't update changed values either. Delete sapling.db first
to do a full reset, then run init_db.py then seed.py.

Study room members:
  user_andres  — Andres Lopez (CS major)
  user_jack    — Jack He      (CS major)
  user_luke    — Luke Cooper  (Math major)
  user_priya   — Priya Patel  (Math major)

School-wide placeholder users (not in any room):
  user_school_1 — Sofia Ramirez   (Physics/CS)
  user_school_2 — Marcus Webb     (CS/Math)
  user_school_3 — Aisha Johnson   (Biology/Stats)
  user_school_4 — Daniel Kim      (Math/Physics)
  user_school_5 — Elena Vasquez   (CS/Stats)
  user_school_6 — Omar Hassan     (Math/CS)
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
    ("user_andres",  "Andres Lopez", "andres@example.com", 8),
    ("user_jack",    "Jack He",      "jack@example.com",   5),
    ("user_luke",    "Luke Cooper",  "luke@example.com",   7),
    ("user_priya",   "Priya Patel",  "priya@example.com",  3),
]

SCHOOL_USERS = [
    ("user_school_1", "Sofia Ramirez",  "sofia@example.com",   6),
    ("user_school_2", "Marcus Webb",    "marcus@example.com",  4),
    ("user_school_3", "Aisha Johnson",  "aisha@example.com",   9),
    ("user_school_4", "Daniel Kim",     "daniel@example.com",  2),
    ("user_school_5", "Elena Vasquez",  "elena@example.com",   7),
    ("user_school_6", "Omar Hassan",    "omar@example.com",    5),
]


def seed_users():
    conn = get_conn()
    for uid, name, email, streak in USERS:
        conn.execute(
            "INSERT OR IGNORE INTO users (id, name, email, streak_count) VALUES (?, ?, ?, ?)",
            (uid, name, email, streak),
        )
    for uid, name, email, streak in SCHOOL_USERS:
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


# ── Room member graphs (unchanged) ────────────────────────────────────────────

JOHN_NODES = [
    {"concept_name": "Variables & Data Types",      "subject": "CS 101", "mastery_score": 0.92},
    {"concept_name": "Control Flow",                "subject": "CS 101", "mastery_score": 0.85},
    {"concept_name": "Functions",                   "subject": "CS 101", "mastery_score": 0.68},
    {"concept_name": "Recursion",                   "subject": "CS 101", "mastery_score": 0.32},
    {"concept_name": "Arrays & Lists",              "subject": "CS 101", "mastery_score": 0.55},
    {"concept_name": "Object-Oriented Programming", "subject": "CS 101", "mastery_score": 0.0},
    {"concept_name": "Complexity Analysis",         "subject": "CS 112", "mastery_score": 0.78},
    {"concept_name": "Stacks & Queues",             "subject": "CS 112", "mastery_score": 0.62},
    {"concept_name": "Linked Lists",                "subject": "CS 112", "mastery_score": 0.38},
    {"concept_name": "Binary Trees",                "subject": "CS 112", "mastery_score": 0.0},
    {"concept_name": "Hash Tables",                 "subject": "CS 112", "mastery_score": 0.0},
    {"concept_name": "Limits",                      "subject": "MA 121", "mastery_score": 0.88},
    {"concept_name": "Continuity",                  "subject": "MA 121", "mastery_score": 0.80},
    {"concept_name": "Basic Derivatives",           "subject": "MA 121", "mastery_score": 0.65},
    {"concept_name": "Product & Quotient Rule",     "subject": "MA 121", "mastery_score": 0.50},
    {"concept_name": "Chain Rule",                  "subject": "MA 121", "mastery_score": 0.28},
    {"concept_name": "Related Rates",               "subject": "MA 121", "mastery_score": 0.0},
    {"concept_name": "Integration Basics",          "subject": "MA 121", "mastery_score": 0.0},
    {"concept_name": "Descriptive Statistics",      "subject": "MA 213", "mastery_score": 0.90},
    {"concept_name": "Probability Basics",          "subject": "MA 213", "mastery_score": 0.58},
    {"concept_name": "Conditional Probability",     "subject": "MA 213", "mastery_score": 0.35},
    {"concept_name": "Random Variables",            "subject": "MA 213", "mastery_score": 0.0},
    {"concept_name": "Normal Distribution",         "subject": "MA 213", "mastery_score": 0.0},
    {"concept_name": "Systems of Linear Equations", "subject": "MA 311", "mastery_score": 0.82},
    {"concept_name": "Matrix Operations",           "subject": "MA 311", "mastery_score": 0.72},
    {"concept_name": "Determinants",                "subject": "MA 311", "mastery_score": 0.55},
    {"concept_name": "Vector Spaces",               "subject": "MA 311", "mastery_score": 0.33},
    {"concept_name": "Linear Transformations",      "subject": "MA 311", "mastery_score": 0.15},
    {"concept_name": "Eigenvalues & Eigenvectors",  "subject": "MA 311", "mastery_score": 0.0},
]
JOHN_EDGES = [
    {"source": "Variables & Data Types",  "target": "Control Flow",               "strength": 0.9},
    {"source": "Control Flow",            "target": "Functions",                  "strength": 0.85},
    {"source": "Functions",               "target": "Recursion",                  "strength": 0.8},
    {"source": "Arrays & Lists",          "target": "Object-Oriented Programming","strength": 0.6},
    {"source": "Arrays & Lists",          "target": "Complexity Analysis",        "strength": 0.8},
    {"source": "Complexity Analysis",     "target": "Stacks & Queues",            "strength": 0.75},
    {"source": "Stacks & Queues",         "target": "Linked Lists",               "strength": 0.7},
    {"source": "Linked Lists",            "target": "Binary Trees",               "strength": 0.65},
    {"source": "Linked Lists",            "target": "Hash Tables",                "strength": 0.6},
    {"source": "Limits",                  "target": "Continuity",                 "strength": 0.9},
    {"source": "Continuity",              "target": "Basic Derivatives",          "strength": 0.85},
    {"source": "Basic Derivatives",       "target": "Product & Quotient Rule",    "strength": 0.8},
    {"source": "Product & Quotient Rule", "target": "Chain Rule",                 "strength": 0.75},
    {"source": "Chain Rule",              "target": "Related Rates",              "strength": 0.7},
    {"source": "Basic Derivatives",       "target": "Integration Basics",         "strength": 0.65},
    {"source": "Descriptive Statistics",  "target": "Probability Basics",         "strength": 0.85},
    {"source": "Probability Basics",      "target": "Conditional Probability",    "strength": 0.8},
    {"source": "Conditional Probability", "target": "Random Variables",           "strength": 0.75},
    {"source": "Random Variables",        "target": "Normal Distribution",        "strength": 0.7},
    {"source": "Systems of Linear Equations", "target": "Matrix Operations",      "strength": 0.85},
    {"source": "Matrix Operations",           "target": "Determinants",           "strength": 0.75},
    {"source": "Determinants",                "target": "Vector Spaces",          "strength": 0.65},
    {"source": "Vector Spaces",               "target": "Linear Transformations", "strength": 0.6},
    {"source": "Linear Transformations",      "target": "Eigenvalues & Eigenvectors", "strength": 0.55},
]

MARIA_NODES = [
    {"concept_name": "Variables & Data Types",      "subject": "CS 101", "mastery_score": 0.95},
    {"concept_name": "Control Flow",                "subject": "CS 101", "mastery_score": 0.90},
    {"concept_name": "Functions",                   "subject": "CS 101", "mastery_score": 0.85},
    {"concept_name": "Recursion",                   "subject": "CS 101", "mastery_score": 0.70},
    {"concept_name": "Arrays & Lists",              "subject": "CS 101", "mastery_score": 0.80},
    {"concept_name": "Object-Oriented Programming", "subject": "CS 101", "mastery_score": 0.55},
    {"concept_name": "Complexity Analysis",         "subject": "CS 112", "mastery_score": 0.88},
    {"concept_name": "Stacks & Queues",             "subject": "CS 112", "mastery_score": 0.75},
    {"concept_name": "Linked Lists",                "subject": "CS 112", "mastery_score": 0.60},
    {"concept_name": "Binary Trees",                "subject": "CS 112", "mastery_score": 0.30},
    {"concept_name": "Hash Tables",                 "subject": "CS 112", "mastery_score": 0.0},
    {"concept_name": "Limits",                      "subject": "MA 121", "mastery_score": 0.55},
    {"concept_name": "Continuity",                  "subject": "MA 121", "mastery_score": 0.48},
    {"concept_name": "Basic Derivatives",           "subject": "MA 121", "mastery_score": 0.35},
    {"concept_name": "Chain Rule",                  "subject": "MA 121", "mastery_score": 0.15},
    {"concept_name": "Descriptive Statistics",      "subject": "MA 213", "mastery_score": 0.65},
    {"concept_name": "Probability Basics",          "subject": "MA 213", "mastery_score": 0.45},
    {"concept_name": "Conditional Probability",     "subject": "MA 213", "mastery_score": 0.20},
    {"concept_name": "Systems of Linear Equations", "subject": "MA 311", "mastery_score": 0.60},
    {"concept_name": "Matrix Operations",           "subject": "MA 311", "mastery_score": 0.45},
    {"concept_name": "Determinants",                "subject": "MA 311", "mastery_score": 0.25},
    {"concept_name": "Vector Spaces",               "subject": "MA 311", "mastery_score": 0.10},
    {"concept_name": "Linear Transformations",      "subject": "MA 311", "mastery_score": 0.0},
    {"concept_name": "Eigenvalues & Eigenvectors",  "subject": "MA 311", "mastery_score": 0.0},
]
MARIA_EDGES = [
    {"source": "Variables & Data Types", "target": "Control Flow",               "strength": 0.9},
    {"source": "Control Flow",           "target": "Functions",                  "strength": 0.9},
    {"source": "Functions",              "target": "Recursion",                  "strength": 0.85},
    {"source": "Arrays & Lists",         "target": "Object-Oriented Programming","strength": 0.7},
    {"source": "Arrays & Lists",         "target": "Complexity Analysis",        "strength": 0.85},
    {"source": "Complexity Analysis",    "target": "Stacks & Queues",            "strength": 0.8},
    {"source": "Stacks & Queues",        "target": "Linked Lists",               "strength": 0.75},
    {"source": "Linked Lists",           "target": "Binary Trees",               "strength": 0.5},
    {"source": "Limits",                 "target": "Continuity",                 "strength": 0.7},
    {"source": "Continuity",             "target": "Basic Derivatives",          "strength": 0.6},
    {"source": "Basic Derivatives",      "target": "Chain Rule",                 "strength": 0.4},
    {"source": "Descriptive Statistics", "target": "Probability Basics",         "strength": 0.7},
    {"source": "Probability Basics",     "target": "Conditional Probability",    "strength": 0.5},
    {"source": "Systems of Linear Equations", "target": "Matrix Operations",     "strength": 0.7},
    {"source": "Matrix Operations",           "target": "Determinants",          "strength": 0.6},
    {"source": "Determinants",                "target": "Vector Spaces",         "strength": 0.45},
    {"source": "Vector Spaces",               "target": "Linear Transformations","strength": 0.35},
]

ALEX_NODES = [
    {"concept_name": "Limits",                      "subject": "MA 121", "mastery_score": 0.95},
    {"concept_name": "Continuity",                  "subject": "MA 121", "mastery_score": 0.92},
    {"concept_name": "Basic Derivatives",           "subject": "MA 121", "mastery_score": 0.88},
    {"concept_name": "Product & Quotient Rule",     "subject": "MA 121", "mastery_score": 0.82},
    {"concept_name": "Chain Rule",                  "subject": "MA 121", "mastery_score": 0.75},
    {"concept_name": "Related Rates",               "subject": "MA 121", "mastery_score": 0.50},
    {"concept_name": "Integration Basics",          "subject": "MA 121", "mastery_score": 0.30},
    {"concept_name": "Descriptive Statistics",      "subject": "MA 213", "mastery_score": 0.92},
    {"concept_name": "Probability Basics",          "subject": "MA 213", "mastery_score": 0.85},
    {"concept_name": "Conditional Probability",     "subject": "MA 213", "mastery_score": 0.78},
    {"concept_name": "Random Variables",            "subject": "MA 213", "mastery_score": 0.55},
    {"concept_name": "Normal Distribution",         "subject": "MA 213", "mastery_score": 0.30},
    {"concept_name": "Variables & Data Types",      "subject": "CS 101", "mastery_score": 0.65},
    {"concept_name": "Control Flow",                "subject": "CS 101", "mastery_score": 0.55},
    {"concept_name": "Functions",                   "subject": "CS 101", "mastery_score": 0.40},
    {"concept_name": "Recursion",                   "subject": "CS 101", "mastery_score": 0.15},
    {"concept_name": "Systems of Linear Equations", "subject": "MA 311", "mastery_score": 0.92},
    {"concept_name": "Matrix Operations",           "subject": "MA 311", "mastery_score": 0.88},
    {"concept_name": "Determinants",                "subject": "MA 311", "mastery_score": 0.82},
    {"concept_name": "Vector Spaces",               "subject": "MA 311", "mastery_score": 0.70},
    {"concept_name": "Linear Transformations",      "subject": "MA 311", "mastery_score": 0.55},
    {"concept_name": "Eigenvalues & Eigenvectors",  "subject": "MA 311", "mastery_score": 0.30},
]
ALEX_EDGES = [
    {"source": "Limits",                  "target": "Continuity",              "strength": 0.95},
    {"source": "Continuity",              "target": "Basic Derivatives",       "strength": 0.9},
    {"source": "Basic Derivatives",       "target": "Product & Quotient Rule", "strength": 0.85},
    {"source": "Product & Quotient Rule", "target": "Chain Rule",              "strength": 0.8},
    {"source": "Chain Rule",              "target": "Related Rates",           "strength": 0.7},
    {"source": "Basic Derivatives",       "target": "Integration Basics",      "strength": 0.6},
    {"source": "Descriptive Statistics",  "target": "Probability Basics",      "strength": 0.9},
    {"source": "Probability Basics",      "target": "Conditional Probability", "strength": 0.85},
    {"source": "Conditional Probability", "target": "Random Variables",        "strength": 0.8},
    {"source": "Random Variables",        "target": "Normal Distribution",     "strength": 0.7},
    {"source": "Variables & Data Types",  "target": "Control Flow",            "strength": 0.75},
    {"source": "Control Flow",            "target": "Functions",               "strength": 0.65},
    {"source": "Functions",               "target": "Recursion",               "strength": 0.4},
    {"source": "Systems of Linear Equations", "target": "Matrix Operations",   "strength": 0.92},
    {"source": "Matrix Operations",           "target": "Determinants",        "strength": 0.88},
    {"source": "Determinants",                "target": "Vector Spaces",       "strength": 0.82},
    {"source": "Vector Spaces",               "target": "Linear Transformations",       "strength": 0.75},
    {"source": "Linear Transformations",      "target": "Eigenvalues & Eigenvectors",   "strength": 0.65},
]

PRIYA_NODES = [
    {"concept_name": "Limits",                      "subject": "MA 121", "mastery_score": 0.90},
    {"concept_name": "Continuity",                  "subject": "MA 121", "mastery_score": 0.85},
    {"concept_name": "Basic Derivatives",           "subject": "MA 121", "mastery_score": 0.78},
    {"concept_name": "Product & Quotient Rule",     "subject": "MA 121", "mastery_score": 0.60},
    {"concept_name": "Chain Rule",                  "subject": "MA 121", "mastery_score": 0.45},
    {"concept_name": "Related Rates",               "subject": "MA 121", "mastery_score": 0.15},
    {"concept_name": "Descriptive Statistics",      "subject": "MA 213", "mastery_score": 0.95},
    {"concept_name": "Probability Basics",          "subject": "MA 213", "mastery_score": 0.88},
    {"concept_name": "Conditional Probability",     "subject": "MA 213", "mastery_score": 0.72},
    {"concept_name": "Random Variables",            "subject": "MA 213", "mastery_score": 0.50},
    {"concept_name": "Normal Distribution",         "subject": "MA 213", "mastery_score": 0.40},
    {"concept_name": "Complexity Analysis",         "subject": "CS 112", "mastery_score": 0.55},
    {"concept_name": "Stacks & Queues",             "subject": "CS 112", "mastery_score": 0.40},
    {"concept_name": "Linked Lists",                "subject": "CS 112", "mastery_score": 0.20},
    {"concept_name": "Binary Trees",                "subject": "CS 112", "mastery_score": 0.0},
]
PRIYA_EDGES = [
    {"source": "Limits",                  "target": "Continuity",              "strength": 0.9},
    {"source": "Continuity",              "target": "Basic Derivatives",       "strength": 0.88},
    {"source": "Basic Derivatives",       "target": "Product & Quotient Rule", "strength": 0.8},
    {"source": "Product & Quotient Rule", "target": "Chain Rule",              "strength": 0.7},
    {"source": "Chain Rule",              "target": "Related Rates",           "strength": 0.5},
    {"source": "Descriptive Statistics",  "target": "Probability Basics",      "strength": 0.92},
    {"source": "Probability Basics",      "target": "Conditional Probability", "strength": 0.85},
    {"source": "Conditional Probability", "target": "Random Variables",        "strength": 0.8},
    {"source": "Random Variables",        "target": "Normal Distribution",     "strength": 0.75},
    {"source": "Complexity Analysis",     "target": "Stacks & Queues",         "strength": 0.65},
    {"source": "Stacks & Queues",         "target": "Linked Lists",            "strength": 0.5},
    {"source": "Linked Lists",            "target": "Binary Trees",            "strength": 0.35},
]

# ── School-wide placeholder graphs ────────────────────────────────────────────

# Sofia Ramirez — Physics/CS, strong in CS fundamentals, light on math
SOFIA_NODES = [
    {"concept_name": "Variables & Data Types",      "subject": "CS 101", "mastery_score": 0.90},
    {"concept_name": "Control Flow",                "subject": "CS 101", "mastery_score": 0.88},
    {"concept_name": "Functions",                   "subject": "CS 101", "mastery_score": 0.80},
    {"concept_name": "Recursion",                   "subject": "CS 101", "mastery_score": 0.72},
    {"concept_name": "Object-Oriented Programming", "subject": "CS 101", "mastery_score": 0.65},
    {"concept_name": "Complexity Analysis",         "subject": "CS 112", "mastery_score": 0.75},
    {"concept_name": "Stacks & Queues",             "subject": "CS 112", "mastery_score": 0.60},
    {"concept_name": "Linked Lists",                "subject": "CS 112", "mastery_score": 0.45},
    {"concept_name": "Limits",                      "subject": "MA 121", "mastery_score": 0.40},
    {"concept_name": "Basic Derivatives",           "subject": "MA 121", "mastery_score": 0.25},
    {"concept_name": "Descriptive Statistics",      "subject": "MA 213", "mastery_score": 0.35},
    {"concept_name": "Probability Basics",          "subject": "MA 213", "mastery_score": 0.20},
]
SOFIA_EDGES = [
    {"source": "Variables & Data Types", "target": "Control Flow",               "strength": 0.9},
    {"source": "Control Flow",           "target": "Functions",                  "strength": 0.85},
    {"source": "Functions",              "target": "Recursion",                  "strength": 0.8},
    {"source": "Recursion",              "target": "Object-Oriented Programming","strength": 0.65},
    {"source": "Complexity Analysis",    "target": "Stacks & Queues",            "strength": 0.75},
    {"source": "Stacks & Queues",        "target": "Linked Lists",               "strength": 0.65},
    {"source": "Limits",                 "target": "Basic Derivatives",          "strength": 0.5},
    {"source": "Descriptive Statistics", "target": "Probability Basics",         "strength": 0.45},
]

# Marcus Webb — CS/Math double major, well-rounded but not exceptional anywhere
MARCUS_NODES = [
    {"concept_name": "Variables & Data Types",      "subject": "CS 101", "mastery_score": 0.75},
    {"concept_name": "Control Flow",                "subject": "CS 101", "mastery_score": 0.70},
    {"concept_name": "Functions",                   "subject": "CS 101", "mastery_score": 0.65},
    {"concept_name": "Arrays & Lists",              "subject": "CS 101", "mastery_score": 0.60},
    {"concept_name": "Complexity Analysis",         "subject": "CS 112", "mastery_score": 0.72},
    {"concept_name": "Stacks & Queues",             "subject": "CS 112", "mastery_score": 0.65},
    {"concept_name": "Binary Trees",                "subject": "CS 112", "mastery_score": 0.50},
    {"concept_name": "Limits",                      "subject": "MA 121", "mastery_score": 0.80},
    {"concept_name": "Continuity",                  "subject": "MA 121", "mastery_score": 0.75},
    {"concept_name": "Basic Derivatives",           "subject": "MA 121", "mastery_score": 0.70},
    {"concept_name": "Chain Rule",                  "subject": "MA 121", "mastery_score": 0.55},
    {"concept_name": "Descriptive Statistics",      "subject": "MA 213", "mastery_score": 0.78},
    {"concept_name": "Probability Basics",          "subject": "MA 213", "mastery_score": 0.65},
    {"concept_name": "Systems of Linear Equations", "subject": "MA 311", "mastery_score": 0.70},
    {"concept_name": "Matrix Operations",           "subject": "MA 311", "mastery_score": 0.60},
]
MARCUS_EDGES = [
    {"source": "Variables & Data Types", "target": "Control Flow",    "strength": 0.85},
    {"source": "Control Flow",           "target": "Functions",       "strength": 0.8},
    {"source": "Functions",              "target": "Arrays & Lists",  "strength": 0.7},
    {"source": "Complexity Analysis",    "target": "Stacks & Queues", "strength": 0.75},
    {"source": "Stacks & Queues",        "target": "Binary Trees",    "strength": 0.6},
    {"source": "Limits",                 "target": "Continuity",      "strength": 0.85},
    {"source": "Continuity",             "target": "Basic Derivatives","strength": 0.8},
    {"source": "Basic Derivatives",      "target": "Chain Rule",       "strength": 0.65},
    {"source": "Descriptive Statistics", "target": "Probability Basics","strength": 0.75},
    {"source": "Systems of Linear Equations", "target": "Matrix Operations", "strength": 0.7},
]

# Aisha Johnson — Biology/Stats, very strong in stats, weak in CS
AISHA_NODES = [
    {"concept_name": "Descriptive Statistics",      "subject": "MA 213", "mastery_score": 0.97},
    {"concept_name": "Probability Basics",          "subject": "MA 213", "mastery_score": 0.93},
    {"concept_name": "Conditional Probability",     "subject": "MA 213", "mastery_score": 0.88},
    {"concept_name": "Random Variables",            "subject": "MA 213", "mastery_score": 0.82},
    {"concept_name": "Normal Distribution",         "subject": "MA 213", "mastery_score": 0.75},
    {"concept_name": "Limits",                      "subject": "MA 121", "mastery_score": 0.60},
    {"concept_name": "Basic Derivatives",           "subject": "MA 121", "mastery_score": 0.45},
    {"concept_name": "Variables & Data Types",      "subject": "CS 101", "mastery_score": 0.30},
    {"concept_name": "Control Flow",                "subject": "CS 101", "mastery_score": 0.20},
    {"concept_name": "Functions",                   "subject": "CS 101", "mastery_score": 0.10},
    {"concept_name": "Complexity Analysis",         "subject": "CS 112", "mastery_score": 0.15},
]
AISHA_EDGES = [
    {"source": "Descriptive Statistics",  "target": "Probability Basics",      "strength": 0.95},
    {"source": "Probability Basics",      "target": "Conditional Probability", "strength": 0.9},
    {"source": "Conditional Probability", "target": "Random Variables",        "strength": 0.85},
    {"source": "Random Variables",        "target": "Normal Distribution",     "strength": 0.8},
    {"source": "Limits",                  "target": "Basic Derivatives",       "strength": 0.6},
    {"source": "Variables & Data Types",  "target": "Control Flow",            "strength": 0.4},
    {"source": "Control Flow",            "target": "Functions",               "strength": 0.3},
]

# Daniel Kim — Math heavy, strong in linear algebra, weak in CS
DANIEL_NODES = [
    {"concept_name": "Systems of Linear Equations", "subject": "MA 311", "mastery_score": 0.95},
    {"concept_name": "Matrix Operations",           "subject": "MA 311", "mastery_score": 0.92},
    {"concept_name": "Determinants",                "subject": "MA 311", "mastery_score": 0.88},
    {"concept_name": "Vector Spaces",               "subject": "MA 311", "mastery_score": 0.82},
    {"concept_name": "Linear Transformations",      "subject": "MA 311", "mastery_score": 0.75},
    {"concept_name": "Eigenvalues & Eigenvectors",  "subject": "MA 311", "mastery_score": 0.60},
    {"concept_name": "Limits",                      "subject": "MA 121", "mastery_score": 0.85},
    {"concept_name": "Continuity",                  "subject": "MA 121", "mastery_score": 0.80},
    {"concept_name": "Basic Derivatives",           "subject": "MA 121", "mastery_score": 0.72},
    {"concept_name": "Chain Rule",                  "subject": "MA 121", "mastery_score": 0.60},
    {"concept_name": "Variables & Data Types",      "subject": "CS 101", "mastery_score": 0.25},
    {"concept_name": "Control Flow",                "subject": "CS 101", "mastery_score": 0.18},
    {"concept_name": "Complexity Analysis",         "subject": "CS 112", "mastery_score": 0.20},
    {"concept_name": "Descriptive Statistics",      "subject": "MA 213", "mastery_score": 0.55},
    {"concept_name": "Probability Basics",          "subject": "MA 213", "mastery_score": 0.42},
]
DANIEL_EDGES = [
    {"source": "Systems of Linear Equations", "target": "Matrix Operations",          "strength": 0.95},
    {"source": "Matrix Operations",           "target": "Determinants",               "strength": 0.9},
    {"source": "Determinants",                "target": "Vector Spaces",              "strength": 0.85},
    {"source": "Vector Spaces",               "target": "Linear Transformations",     "strength": 0.8},
    {"source": "Linear Transformations",      "target": "Eigenvalues & Eigenvectors", "strength": 0.72},
    {"source": "Limits",                      "target": "Continuity",                 "strength": 0.88},
    {"source": "Continuity",                  "target": "Basic Derivatives",          "strength": 0.82},
    {"source": "Basic Derivatives",           "target": "Chain Rule",                 "strength": 0.7},
    {"source": "Variables & Data Types",      "target": "Control Flow",               "strength": 0.35},
    {"source": "Descriptive Statistics",      "target": "Probability Basics",         "strength": 0.6},
]

# Elena Vasquez — CS/Stats, strong in CS112, decent stats, weak in calculus
ELENA_NODES = [
    {"concept_name": "Complexity Analysis",         "subject": "CS 112", "mastery_score": 0.92},
    {"concept_name": "Stacks & Queues",             "subject": "CS 112", "mastery_score": 0.88},
    {"concept_name": "Linked Lists",                "subject": "CS 112", "mastery_score": 0.82},
    {"concept_name": "Binary Trees",                "subject": "CS 112", "mastery_score": 0.75},
    {"concept_name": "Hash Tables",                 "subject": "CS 112", "mastery_score": 0.65},
    {"concept_name": "Variables & Data Types",      "subject": "CS 101", "mastery_score": 0.85},
    {"concept_name": "Control Flow",                "subject": "CS 101", "mastery_score": 0.80},
    {"concept_name": "Functions",                   "subject": "CS 101", "mastery_score": 0.75},
    {"concept_name": "Recursion",                   "subject": "CS 101", "mastery_score": 0.68},
    {"concept_name": "Descriptive Statistics",      "subject": "MA 213", "mastery_score": 0.72},
    {"concept_name": "Probability Basics",          "subject": "MA 213", "mastery_score": 0.65},
    {"concept_name": "Conditional Probability",     "subject": "MA 213", "mastery_score": 0.50},
    {"concept_name": "Limits",                      "subject": "MA 121", "mastery_score": 0.30},
    {"concept_name": "Basic Derivatives",           "subject": "MA 121", "mastery_score": 0.20},
    {"concept_name": "Systems of Linear Equations", "subject": "MA 311", "mastery_score": 0.35},
    {"concept_name": "Matrix Operations",           "subject": "MA 311", "mastery_score": 0.25},
]
ELENA_EDGES = [
    {"source": "Complexity Analysis",    "target": "Stacks & Queues",  "strength": 0.92},
    {"source": "Stacks & Queues",        "target": "Linked Lists",     "strength": 0.88},
    {"source": "Linked Lists",           "target": "Binary Trees",     "strength": 0.82},
    {"source": "Binary Trees",           "target": "Hash Tables",      "strength": 0.72},
    {"source": "Variables & Data Types", "target": "Control Flow",     "strength": 0.88},
    {"source": "Control Flow",           "target": "Functions",        "strength": 0.82},
    {"source": "Functions",              "target": "Recursion",        "strength": 0.75},
    {"source": "Descriptive Statistics", "target": "Probability Basics","strength": 0.78},
    {"source": "Probability Basics",     "target": "Conditional Probability","strength": 0.65},
    {"source": "Limits",                 "target": "Basic Derivatives", "strength": 0.4},
    {"source": "Systems of Linear Equations", "target": "Matrix Operations","strength": 0.45},
]

# Omar Hassan — Math/CS, strong in calculus and linear algebra, building CS
OMAR_NODES = [
    {"concept_name": "Limits",                      "subject": "MA 121", "mastery_score": 0.93},
    {"concept_name": "Continuity",                  "subject": "MA 121", "mastery_score": 0.90},
    {"concept_name": "Basic Derivatives",           "subject": "MA 121", "mastery_score": 0.85},
    {"concept_name": "Product & Quotient Rule",     "subject": "MA 121", "mastery_score": 0.78},
    {"concept_name": "Chain Rule",                  "subject": "MA 121", "mastery_score": 0.70},
    {"concept_name": "Related Rates",               "subject": "MA 121", "mastery_score": 0.55},
    {"concept_name": "Integration Basics",          "subject": "MA 121", "mastery_score": 0.42},
    {"concept_name": "Systems of Linear Equations", "subject": "MA 311", "mastery_score": 0.88},
    {"concept_name": "Matrix Operations",           "subject": "MA 311", "mastery_score": 0.82},
    {"concept_name": "Determinants",                "subject": "MA 311", "mastery_score": 0.75},
    {"concept_name": "Vector Spaces",               "subject": "MA 311", "mastery_score": 0.60},
    {"concept_name": "Variables & Data Types",      "subject": "CS 101", "mastery_score": 0.55},
    {"concept_name": "Control Flow",                "subject": "CS 101", "mastery_score": 0.48},
    {"concept_name": "Functions",                   "subject": "CS 101", "mastery_score": 0.35},
    {"concept_name": "Complexity Analysis",         "subject": "CS 112", "mastery_score": 0.40},
    {"concept_name": "Descriptive Statistics",      "subject": "MA 213", "mastery_score": 0.65},
    {"concept_name": "Probability Basics",          "subject": "MA 213", "mastery_score": 0.50},
]
OMAR_EDGES = [
    {"source": "Limits",                  "target": "Continuity",              "strength": 0.93},
    {"source": "Continuity",              "target": "Basic Derivatives",       "strength": 0.88},
    {"source": "Basic Derivatives",       "target": "Product & Quotient Rule", "strength": 0.82},
    {"source": "Product & Quotient Rule", "target": "Chain Rule",              "strength": 0.75},
    {"source": "Chain Rule",              "target": "Related Rates",           "strength": 0.68},
    {"source": "Basic Derivatives",       "target": "Integration Basics",      "strength": 0.55},
    {"source": "Systems of Linear Equations", "target": "Matrix Operations",   "strength": 0.88},
    {"source": "Matrix Operations",           "target": "Determinants",        "strength": 0.82},
    {"source": "Determinants",                "target": "Vector Spaces",       "strength": 0.72},
    {"source": "Variables & Data Types",  "target": "Control Flow",            "strength": 0.6},
    {"source": "Control Flow",            "target": "Functions",               "strength": 0.5},
    {"source": "Descriptive Statistics",  "target": "Probability Basics",      "strength": 0.65},
]


# ─── Assignments ──────────────────────────────────────────────────────────────

JOHN_ASSIGNMENTS = [
    {"title": "Lab 4: Functions & Scope",        "course_name": "CS 101",  "due_date": "2026-03-03", "assignment_type": "homework"},
    {"title": "Problem Set 5: Derivatives",      "course_name": "MA 121",  "due_date": "2026-03-05", "assignment_type": "homework"},
    {"title": "Lab 5: Linked Lists",             "course_name": "CS 112",  "due_date": "2026-03-07", "assignment_type": "homework"},
    {"title": "Linear Algebra Problem Set 2",    "course_name": "MA 311",  "due_date": "2026-03-10", "assignment_type": "homework"},
    {"title": "Stats Midterm",                   "course_name": "MA 213",  "due_date": "2026-03-12", "assignment_type": "exam"},
    {"title": "Midterm Exam",                    "course_name": "MA 121",  "due_date": "2026-03-14", "assignment_type": "exam"},
    {"title": "Programming Project 2",           "course_name": "CS 101",  "due_date": "2026-03-21", "assignment_type": "project"},
    {"title": "CS 112 Midterm",                  "course_name": "CS 112",  "due_date": "2026-03-26", "assignment_type": "exam"},
    {"title": "Problem Set 6: Chain Rule",       "course_name": "MA 121",  "due_date": "2026-04-02", "assignment_type": "homework"},
    {"title": "Linear Algebra Midterm",          "course_name": "MA 311",  "due_date": "2026-04-07", "assignment_type": "exam"},
    {"title": "Final Project",                   "course_name": "CS 101",  "due_date": "2026-04-28", "assignment_type": "project"},
    {"title": "Linear Algebra Final",            "course_name": "MA 311",  "due_date": "2026-05-05", "assignment_type": "exam"},
    {"title": "Final Exam",                      "course_name": "MA 121",  "due_date": "2026-05-08", "assignment_type": "exam"},
]
MARIA_ASSIGNMENTS = [
    {"title": "Programming Lab 4",               "course_name": "CS 101",  "due_date": "2026-03-04", "assignment_type": "homework"},
    {"title": "Linear Algebra Problem Set 2",    "course_name": "MA 311",  "due_date": "2026-03-10", "assignment_type": "homework"},
    {"title": "Data Structures Project 1",       "course_name": "CS 112",  "due_date": "2026-03-13", "assignment_type": "project"},
    {"title": "Calculus Midterm",                "course_name": "MA 121",  "due_date": "2026-03-15", "assignment_type": "exam"},
    {"title": "CS 101 Midterm",                  "course_name": "CS 101",  "due_date": "2026-03-20", "assignment_type": "exam"},
    {"title": "Stats Quiz 3",                    "course_name": "MA 213",  "due_date": "2026-03-25", "assignment_type": "quiz"},
    {"title": "Linear Algebra Midterm",          "course_name": "MA 311",  "due_date": "2026-04-07", "assignment_type": "exam"},
    {"title": "CS 112 Lab: Hash Tables",         "course_name": "CS 112",  "due_date": "2026-04-10", "assignment_type": "homework"},
    {"title": "Programming Project 3",           "course_name": "CS 101",  "due_date": "2026-04-24", "assignment_type": "project"},
    {"title": "Linear Algebra Final",            "course_name": "MA 311",  "due_date": "2026-05-05", "assignment_type": "exam"},
    {"title": "CS 112 Final Exam",               "course_name": "CS 112",  "due_date": "2026-05-09", "assignment_type": "exam"},
]
ALEX_ASSIGNMENTS = [
    {"title": "Calculus Problem Set 6",          "course_name": "MA 121",  "due_date": "2026-03-03", "assignment_type": "homework"},
    {"title": "Linear Algebra Problem Set 2",    "course_name": "MA 311",  "due_date": "2026-03-10", "assignment_type": "homework"},
    {"title": "Stats Midterm",                   "course_name": "MA 213",  "due_date": "2026-03-12", "assignment_type": "exam"},
    {"title": "MA 121 Midterm",                  "course_name": "MA 121",  "due_date": "2026-03-17", "assignment_type": "exam"},
    {"title": "CS 101 Lab 3",                    "course_name": "CS 101",  "due_date": "2026-03-24", "assignment_type": "homework"},
    {"title": "Linear Algebra Midterm",          "course_name": "MA 311",  "due_date": "2026-04-07", "assignment_type": "exam"},
    {"title": "Stats Problem Set 4",             "course_name": "MA 213",  "due_date": "2026-04-11", "assignment_type": "homework"},
    {"title": "Linear Algebra Final",            "course_name": "MA 311",  "due_date": "2026-05-05", "assignment_type": "exam"},
    {"title": "MA 213 Final Exam",               "course_name": "MA 213",  "due_date": "2026-05-10", "assignment_type": "exam"},
]
PRIYA_ASSIGNMENTS = [
    {"title": "Calculus Problem Set 6",          "course_name": "MA 121",  "due_date": "2026-03-03", "assignment_type": "homework"},
    {"title": "Stats Midterm",                   "course_name": "MA 213",  "due_date": "2026-03-12", "assignment_type": "exam"},
    {"title": "CS 112 Lab: Linked Lists",        "course_name": "CS 112",  "due_date": "2026-03-18", "assignment_type": "homework"},
    {"title": "MA 121 Midterm",                  "course_name": "MA 121",  "due_date": "2026-03-19", "assignment_type": "exam"},
    {"title": "Stats Problem Set 4",             "course_name": "MA 213",  "due_date": "2026-04-11", "assignment_type": "homework"},
    {"title": "MA 121 Final Exam",               "course_name": "MA 121",  "due_date": "2026-05-06", "assignment_type": "exam"},
    {"title": "MA 213 Final Exam",               "course_name": "MA 213",  "due_date": "2026-05-10", "assignment_type": "exam"},
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
ROOM_MEMBERS = ["user_andres", "user_jack", "user_luke", "user_priya"]

ROOM_ACTIVITY = [
    {"user": "user_jack",   "type": "mastered",  "concept": "Functions",             "detail": "85%"},
    {"user": "user_luke",   "type": "mastered",  "concept": "Basic Derivatives",     "detail": "88%"},
    {"user": "user_andres", "type": "learned",   "concept": "Chain Rule",            "detail": "28%"},
    {"user": "user_jack",   "type": "quizzed",   "concept": "Recursion",             "detail": "7/10"},
    {"user": "user_luke",   "type": "streak",    "concept": None,                    "detail": "7-day streak"},
    {"user": "user_andres", "type": "learned",   "concept": "Product & Quotient Rule","detail": "50%"},
    {"user": "user_priya",  "type": "mastered",  "concept": "Probability Basics",    "detail": "88%"},
    {"user": "user_priya",  "type": "joined",    "concept": None,                    "detail": "joined the room"},
    {"user": "user_jack",   "type": "joined",    "concept": None,                    "detail": "joined the room"},
]


def seed_room():
    conn = get_conn()
    conn.execute(
        "INSERT OR IGNORE INTO rooms (id, name, invite_code, created_by) VALUES (?, ?, ?, ?)",
        (ROOM_ID, ROOM_NAME, ROOM_CODE, "user_andres"),
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
    for uid in ROOM_MEMBERS:
        conn.execute("UPDATE users SET room_id = ? WHERE id = ?", (ROOM_ID, uid))
    conn.commit()
    conn.close()
    print(f"Room '{ROOM_NAME}' seeded with {len(ROOM_MEMBERS)} members.")


# ─── Courses ──────────────────────────────────────────────────────────────────

COURSE_COLORS = {
    "CS 101": "#2563eb",
    "CS 112": "#6366f1",
    "MA 121": "#0d9488",
    "MA 213": "#d97706",
    "MA 311": "#7c3aed",
}

USER_COURSES = {
    "user_andres": ["CS 101", "CS 112", "MA 121", "MA 213", "MA 311"],
    "user_jack":   ["CS 101", "CS 112", "MA 121", "MA 213", "MA 311"],
    "user_luke":   ["MA 121", "MA 213", "MA 311", "CS 101"],
    "user_priya":  ["MA 121", "MA 213", "CS 112"],
}


def seed_courses():
    conn = get_conn()
    for user_id, courses in USER_COURSES.items():
        for course_name in courses:
            color = COURSE_COLORS.get(course_name)
            conn.execute(
                "INSERT OR IGNORE INTO courses (id, user_id, course_name, color) VALUES (?, ?, ?, ?)",
                (str(uuid.uuid4()), user_id, course_name, color),
            )
    conn.commit()
    conn.close()
    print("Courses seeded.")


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Seeding users...")
    seed_users()
    print("Seeding courses...")
    seed_courses()
    print("Seeding graphs...")
    seed_graph("user_andres",  JOHN_NODES,  JOHN_EDGES)
    seed_graph("user_jack",    MARIA_NODES, MARIA_EDGES)
    seed_graph("user_luke",    ALEX_NODES,  ALEX_EDGES)
    seed_graph("user_priya",   PRIYA_NODES, PRIYA_EDGES)
    seed_graph("user_school_1", SOFIA_NODES,   SOFIA_EDGES)
    seed_graph("user_school_2", MARCUS_NODES,  MARCUS_EDGES)
    seed_graph("user_school_3", AISHA_NODES,   AISHA_EDGES)
    seed_graph("user_school_4", DANIEL_NODES,  DANIEL_EDGES)
    seed_graph("user_school_5", ELENA_NODES,   ELENA_EDGES)
    seed_graph("user_school_6", OMAR_NODES,    OMAR_EDGES)
    print("Seeding assignments...")
    seed_assignments("user_andres",  JOHN_ASSIGNMENTS)
    seed_assignments("user_jack",    MARIA_ASSIGNMENTS)
    seed_assignments("user_luke",    ALEX_ASSIGNMENTS)
    seed_assignments("user_priya",   PRIYA_ASSIGNMENTS)
    print("Seeding room...")
    seed_room()
    print(f"\nDone! DB: {DATABASE_PATH}")