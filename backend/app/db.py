from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from .config import settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongo_uri, serverSelectionTimeoutMS=8000)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    return get_client()[settings.mongo_db]


def responses():
    return get_db()["responses"]


async def init_indexes() -> None:
    col = responses()
    await col.create_index("created_at")
    await col.create_index("persona")
    await col.create_index("department")
    await col.create_index([("name", 1)])


async def close_client() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
