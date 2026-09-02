"""Offline smoke test — runs the whole API against an in-memory Mongo.

    python smoke_test.py

Requires: pip install mongomock_motor httpx
"""
import asyncio
import os
import random

os.environ.setdefault("ADMIN_USERNAME", "admin")
os.environ.setdefault("ADMIN_PASSWORD", "pulse-test")
os.environ.setdefault("JWT_SECRET", "smoke-secret")
os.environ.setdefault("SERVE_FRONTEND", "false")

from mongomock_motor import AsyncMongoMockClient  # noqa: E402

from app import db as db_module  # noqa: E402

_fake = AsyncMongoMockClient()
db_module.get_client = lambda: _fake
db_module.get_db = lambda: _fake["ai_pulse"]
db_module.responses = lambda: _fake["ai_pulse"]["responses"]


async def _noop():
    return None


db_module.init_indexes = _noop
db_module.close_client = _noop

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app import instrument  # noqa: E402

NAMES = ["Ananya Sharma", "Rohit Nair", "Fatima K", "Vikram Rao", "Meera Iyer",
         "Arjun Das", "Sara Thomas", "Nikhil Gupta"]


def main() -> None:
    with TestClient(app) as c:
        assert c.get("/api/health").status_code == 200
        meta = c.get("/api/meta").json()
        assert len(meta["departments"]) == 34
        print("meta ok:", len(meta["usage_items"]), "usage items,",
              len(meta["dependency_items"]), "dependency items")

        random.seed(7)
        for i in range(40):
            payload = {
                "name": random.choice(NAMES),
                "age": random.randint(17, 28),
                "department": random.choice(meta["departments"]),
                "program": random.choice(["B.Tech CSE", "BBA", "M.Sc Psychology", "B.Com"]),
                "avatar": random.choice(["Nova", "Kai", "Mira"]),
                "usage": [random.randint(1, 5) for _ in range(5)],
                "dependency": [random.randint(1, 5) for _ in range(6)],
                "duration": random.choice(meta["experience"]["duration"]),
                "daily": random.choice(meta["experience"]["daily"]),
                "tool": random.choice(meta["experience"]["tool"]),
                "xp": random.randint(120, 190),
                "best_streak": random.randint(0, 12),
            }
            r = c.post("/api/submit", json=payload)
            assert r.status_code == 200, r.text
            if i == 0:
                body = r.json()
                print("submit ok:", body["persona"], body["readiness"])
                assert c.get(f"/api/result/{body['id']}").status_code == 200

        # validation
        bad = c.post("/api/submit", json={"name": "X", "age": 5, "department": "nope",
                                          "program": "", "usage": [1], "dependency": [1],
                                          "duration": "x", "daily": "x", "tool": "x"})
        assert bad.status_code == 422, bad.status_code
        print("validation ok")

        # auth
        assert c.get("/api/admin/stats").status_code == 401
        assert c.post("/api/admin/login",
                      json={"username": "admin", "password": "wrong"}).status_code == 401
        tok = c.post("/api/admin/login",
                     json={"username": "admin", "password": "pulse-test"}).json()["access_token"]
        h = {"Authorization": f"Bearer {tok}"}
        print("auth ok")

        s = c.get("/api/admin/stats", headers=h).json()
        assert s["total"] == 40
        assert sum(p["count"] for p in s["personas"]) == 40
        assert len(s["usage_items"]) == 5 and len(s["dependency_items"]) == 6
        assert sum(t["count"] for t in s["tools"]) == 40
        print("stats ok:", s["total"], "responses ·",
              {p["key"]: p["count"] for p in s["personas"]},
              "· avg readiness", s["averages"]["readiness"])

        lst = c.get("/api/admin/responses?page=1&page_size=10", headers=h).json()
        assert lst["total"] == 40 and len(lst["items"]) == 10
        filt = c.get("/api/admin/responses?persona=power", headers=h).json()
        print("table ok: page of", len(lst["items"]), "· power-user filter ->", filt["total"])

        full = c.get("/api/admin/export.csv", headers=h)
        anon = c.get("/api/admin/export.csv?anonymise=true", headers=h)
        assert full.status_code == 200 and anon.status_code == 200
        assert "name" in full.text.splitlines()[0]
        assert "respondent_code" in anon.text.splitlines()[0]
        assert "R00001" in anon.text
        for n in set(NAMES):
            assert n not in anon.text, "anonymised export leaked a name"
        print("export ok: full", len(full.text.splitlines()) - 1, "rows · anonymised clean")

        did = lst["items"][0]["id"]
        assert c.delete(f"/api/admin/responses/{did}", headers=h).json()["deleted"]
        assert c.get("/api/admin/stats", headers=h).json()["total"] == 39
        print("delete ok")

    # scoring sanity
    assert instrument.score([5] * 5, [1, 5, 1, 1, 5, 5])["persona"] == "power"
    assert instrument.score([5] * 5, [5, 1, 5, 5, 1, 1])["persona"] == "autopilot"
    assert instrument.score([1] * 5, [1, 5, 1, 1, 5, 5])["persona"] == "critic"
    assert instrument.score([1] * 5, [5, 1, 5, 5, 1, 1])["persona"] == "explorer"
    print("persona quadrant ok")
    print("\nALL CHECKS PASSED")


if __name__ == "__main__":
    asyncio.set_event_loop(asyncio.new_event_loop())
    main()
