"""Run the whole app with an in-memory database and seeded demo data.

    python demo_server.py     # http://localhost:8096  (admin / demo1234)

Useful for previewing the UI before MongoDB is wired up. Never use in production.
"""
import os
import random

os.environ.setdefault("ADMIN_USERNAME", "admin")
os.environ.setdefault("ADMIN_PASSWORD", "demo1234")
os.environ.setdefault("JWT_SECRET", "demo-secret")
os.environ.setdefault("SERVE_FRONTEND", "true")

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

from datetime import datetime, timedelta, timezone  # noqa: E402

import uvicorn  # noqa: E402

from app import instrument  # noqa: E402
from app.main import app  # noqa: E402

NAMES = [
    "Ananya Sharma", "Rohit Nair", "Fatima Khan", "Vikram Rao", "Meera Iyer",
    "Arjun Das", "Sara Thomas", "Nikhil Gupta", "Priya Menon", "Kabir Shah",
    "Divya Reddy", "Aman Verma", "Neha Joshi", "Rahul Pillai", "Isha Bhat",
]
PROGRAMS = ["B.Tech CSE", "B.Tech ISE", "BBA", "B.Com", "M.Sc Psychology", "BA JMC", "B.Des"]


async def seed():
    random.seed(11)
    col = db_module.responses()
    if await col.count_documents({}) > 0:
        return
    now = datetime.now(timezone.utc)
    docs = []
    for i in range(180):
        usage = [max(1, min(5, int(random.gauss(3.4, 1.1)))) for _ in range(5)]
        dep = [max(1, min(5, int(random.gauss(3.1, 1.2)))) for _ in range(6)]
        scored = instrument.score(usage, dep)
        docs.append(
            {
                "name": random.choice(NAMES),
                "age": random.randint(17, 27),
                "department": random.choice(instrument.DEPARTMENTS[:14]),
                "program": random.choice(PROGRAMS),
                "avatar": random.choice(["Nova", "Kai", "Mira", "Rex"]),
                "usage": usage,
                "dependency": dep,
                "duration": random.choice(instrument.EXPERIENCE["duration"]),
                "daily": random.choice(instrument.EXPERIENCE["daily"]),
                "tool": random.choices(
                    instrument.EXPERIENCE["tool"], weights=[55, 18, 9, 12, 6]
                )[0],
                "xp": random.randint(120, 190),
                "best_streak": random.randint(0, 14),
                "created_at": now - timedelta(days=random.randint(0, 21), hours=random.randint(0, 23)),
                **scored,
            }
        )
    await col.insert_many(docs)
    print(f"seeded {len(docs)} demo responses")


if __name__ == "__main__":
    import asyncio

    asyncio.run(seed())
    uvicorn.run(app, host="0.0.0.0", port=8096)
