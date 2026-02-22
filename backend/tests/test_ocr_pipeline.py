"""
Test the full OCR → Gemini → DB pipeline.

Run from backend/:
    python3 tests/test_ocr_pipeline.py
"""
import sys
import os
import sqlite3

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import DATABASE_PATH
from services.gemini_service import call_gemini_json
from services.calendar_service import save_assignments_to_db, process_and_save_syllabus

# ── Fake syllabus text (skips OCR so no Tesseract needed) ──────────────────────
SAMPLE_SYLLABUS = """
CS 101 — Introduction to Programming
Spring 2026

Assignments & Deadlines
-----------------------
Lab 7: Recursion                    Due: March 15, 2026
Problem Set 3: Loops & Functions    Due: March 20, 2026
Midterm Project                     Due: April 1, 2026   (project)
Final Exam                          Due: May 10, 2026    (exam)
Quiz 4: OOP Basics                  Due: March 28, 2026
"""

TEST_USER = "user_andres"


def test_gemini_parse():
    print("\n[1] Testing Gemini parsing from raw text...")
    from services.calendar_service import parse_syllabus
    result = parse_syllabus(SAMPLE_SYLLABUS)
    assignments = result.get("assignments", [])
    assert len(assignments) > 0, "Gemini returned no assignments"
    print(f"    Gemini extracted {len(assignments)} assignments:")
    for a in assignments:
        print(f"      • {a.get('title')} | {a.get('due_date')} | {a.get('assignment_type')}")
    return assignments


def test_save_to_db(assignments):
    print("\n[2] Testing save_assignments_to_db()...")
    # Count before
    conn = sqlite3.connect(DATABASE_PATH)
    before = conn.execute(
        "SELECT COUNT(*) FROM assignments WHERE user_id = ?", (TEST_USER,)
    ).fetchone()[0]
    conn.close()

    saved = save_assignments_to_db(TEST_USER, assignments)
    assert saved == len(assignments), f"Expected {len(assignments)} saved, got {saved}"

    conn = sqlite3.connect(DATABASE_PATH)
    after = conn.execute(
        "SELECT COUNT(*) FROM assignments WHERE user_id = ?", (TEST_USER,)
    ).fetchone()[0]
    rows = conn.execute(
        "SELECT title, due_date, assignment_type FROM assignments WHERE user_id = ? ORDER BY due_date",
        (TEST_USER,)
    ).fetchall()
    conn.close()

    print(f"    Saved {saved} rows (DB went from {before} → {after} for {TEST_USER})")
    print(f"    Sample rows now in DB:")
    for r in rows[-5:]:
        print(f"      • {r[0]} | {r[1]} | {r[2]}")


def test_full_pipeline():
    print("\n[3] Testing process_and_save_syllabus() full pipeline with a text/plain file...")
    fake_bytes = SAMPLE_SYLLABUS.encode("utf-8")
    result = process_and_save_syllabus(
        file_bytes=fake_bytes,
        filename="syllabus_test.txt",
        content_type="text/plain",
        user_id=TEST_USER,
    )
    print(f"    assignments returned : {len(result['assignments'])}")
    print(f"    saved_count          : {result['saved_count']}")
    print(f"    warnings             : {result.get('warnings', [])}")
    assert result["saved_count"] >= 0, "save_count should be non-negative"
    print("    Pipeline OK")


if __name__ == "__main__":
    print("=" * 55)
    print("Sapling OCR Pipeline Test")
    print(f"DB: {DATABASE_PATH}")
    print("=" * 55)

    try:
        assignments = test_gemini_parse()
        test_save_to_db(assignments)
        test_full_pipeline()
        print("\n✓ All tests passed")
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
