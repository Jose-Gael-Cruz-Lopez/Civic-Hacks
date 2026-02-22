"""
Remove duplicate graph_nodes rows where (user_id, concept_name) appears more than once.
Keeps the row with the highest mastery_score (tiebreak: most times_studied).
Also cleans up dependent rows in graph_edges, quiz_attempts, and quiz_context.

Run from the backend/ directory:
    python db/dedup_nodes.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

from collections import defaultdict
from db.connection import table


def dedup():
    nodes = table("graph_nodes").select("id,user_id,concept_name,mastery_score,times_studied")

    groups: dict = defaultdict(list)
    for n in nodes:
        groups[(n["user_id"], n["concept_name"])].append(n)

    to_delete: list[str] = []
    for (user_id, concept_name), dupes in groups.items():
        if len(dupes) <= 1:
            continue
        dupes.sort(
            key=lambda x: (x.get("mastery_score") or 0, x.get("times_studied") or 0),
            reverse=True,
        )
        kept = dupes[0]
        removed = dupes[1:]
        to_delete.extend(n["id"] for n in removed)
        print(f"  [{user_id}] '{concept_name}' — keeping {kept['id'][:8]}, removing {len(removed)}")

    if not to_delete:
        print("No duplicate nodes found.")
        return

    print(f"\nRemoving {len(to_delete)} duplicate node(s)…")
    id_list = ",".join(to_delete)

    # Delete edges that reference any of the duplicate nodes
    deleted_edges = 0
    for col in ("source_node_id", "target_node_id"):
        try:
            rows = table("graph_edges").delete({col: f"in.({id_list})"})
            deleted_edges += len(rows)
        except Exception as e:
            print(f"  Warning: could not delete edges by {col}: {e}")

    # Null out quiz_attempts.concept_node_id (nullable FK)
    try:
        table("quiz_attempts").update(
            {"concept_node_id": None},
            {"concept_node_id": f"in.({id_list})"},
        )
    except Exception as e:
        print(f"  Warning: could not null quiz_attempts: {e}")

    # Delete quiz_context rows tied to duplicate nodes
    try:
        table("quiz_context").delete({"concept_node_id": f"in.({id_list})"})
    except Exception as e:
        print(f"  Warning: could not delete quiz_context: {e}")

    # Finally delete the duplicate nodes
    table("graph_nodes").delete({"id": f"in.({id_list})"})
    print(f"Done. Removed {len(to_delete)} node(s), {deleted_edges} edge(s).")


if __name__ == "__main__":
    dedup()
