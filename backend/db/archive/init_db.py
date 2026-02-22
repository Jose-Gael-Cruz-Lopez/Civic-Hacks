"""
Initialize the database schema.

Run once (or to reset the schema):
    python3 db/init_db.py

This only creates tables — it does NOT insert any data.
To seed data, run:  python3 db/seed.py
"""
import sqlite3
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import DATABASE_PATH

SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


def init_db():
    conn = sqlite3.connect(DATABASE_PATH)
    with open(SCHEMA_PATH) as f:
        conn.executescript(f.read())
    conn.commit()
    conn.close()
    print(f"Schema initialized. DB at: {DATABASE_PATH}")


if __name__ == "__main__":
    init_db()
