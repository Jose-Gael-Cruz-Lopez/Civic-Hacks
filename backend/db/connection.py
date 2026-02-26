import os
from typing import Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "").strip()
REST_URL = f"{SUPABASE_URL}/rest/v1"

_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# Persistent client — reuses TCP connections across requests (much faster)
_client = httpx.Client(headers=_HEADERS, timeout=30.0)


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
        r = _client.get(self.url, params=params)
        r.raise_for_status()
        return r.json()

    def insert(self, data) -> list:
        r = _client.post(self.url, json=data)
        r.raise_for_status()
        return r.json()

    def update(self, data: dict, filters: dict) -> list:
        r = _client.patch(self.url, params=filters, json=data)
        r.raise_for_status()
        return r.json()

    def upsert(self, data, on_conflict: str = "id") -> list:
        headers = {"Prefer": "return=representation,resolution=merge-duplicates"}
        r = _client.post(self.url, headers=headers, params={"on_conflict": on_conflict}, json=data)
        r.raise_for_status()
        return r.json()

    def delete(self, filters: dict) -> list:
        r = _client.delete(self.url, params=filters)
        r.raise_for_status()
        return r.json()


def table(name: str) -> SupabaseTable:
    return SupabaseTable(name)
