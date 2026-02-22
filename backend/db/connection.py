import os
from typing import Optional

import httpx

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "").strip()
REST_URL = f"{SUPABASE_URL}/rest/v1"

_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


class SupabaseTable:
    """Thin synchronous wrapper around Supabase PostgREST REST API."""

    def __init__(self, name: str):
        self.name = name
        self.url = f"{REST_URL}/{name}"

    def select(
        self,
        columns: str = "*",
        filters: Optional[dict] = None,
        order: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> list:
        params: dict = {"select": columns}
        if filters:
            params.update(filters)
        if order:
            params["order"] = order
        if limit:
            params["limit"] = str(limit)
        r = httpx.get(self.url, headers=_HEADERS, params=params)
        r.raise_for_status()
        return r.json()

    def insert(self, data) -> list:
        r = httpx.post(self.url, headers=_HEADERS, json=data)
        r.raise_for_status()
        return r.json()

    def update(self, data: dict, filters: dict) -> list:
        r = httpx.patch(self.url, headers=_HEADERS, params=filters, json=data)
        r.raise_for_status()
        return r.json()

    def upsert(self, data, on_conflict: str = "id") -> list:
        headers = {
            **_HEADERS,
            "Prefer": "return=representation,resolution=merge-duplicates",
        }
        r = httpx.post(self.url, headers=headers, params={"on_conflict": on_conflict}, json=data)
        r.raise_for_status()
        return r.json()

    def delete(self, filters: dict) -> list:
        r = httpx.delete(self.url, headers=_HEADERS, params=filters)
        r.raise_for_status()
        return r.json()


def table(name: str) -> SupabaseTable:
    return SupabaseTable(name)
