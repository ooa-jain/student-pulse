from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Request

from .. import instrument
from ..db import responses
from ..schemas import SubmissionIn

router = APIRouter(prefix="/api", tags=["survey"])


@router.get("/meta")
async def get_meta():
    return instrument.meta()


@router.post("/submit")
async def submit(payload: SubmissionIn, request: Request):
    if payload.department not in instrument.DEPARTMENTS:
        raise HTTPException(status_code=422, detail="Unknown department")
    for field in ("duration", "daily", "tool"):
        if getattr(payload, field) not in instrument.EXPERIENCE[field]:
            raise HTTPException(status_code=422, detail=f"Invalid {field}")

    scored = instrument.score(payload.usage, payload.dependency)
    doc = {
        **payload.model_dump(),
        **scored,
        "created_at": datetime.now(timezone.utc),
        "user_agent": request.headers.get("user-agent", "")[:300],
    }
    result = await responses().insert_one(doc)

    persona = instrument.PERSONAS[scored["persona"]]
    return {
        "id": str(result.inserted_id),
        **scored,
        "persona_detail": persona,
        "name": payload.name,
        "department": payload.department,
        "program": payload.program,
        "avatar": payload.avatar,
        "tool": payload.tool,
        "duration": payload.duration,
        "daily": payload.daily,
        "xp": payload.xp,
        "best_streak": payload.best_streak,
    }


@router.get("/result/{response_id}")
async def get_result(response_id: str):
    try:
        oid = ObjectId(response_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Bad id")
    doc = await responses().find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    doc["id"] = str(doc.pop("_id"))
    doc["persona_detail"] = instrument.PERSONAS[doc["persona"]]
    doc.pop("user_agent", None)
    return doc


@router.get("/pulse")
async def public_pulse():
    """Tiny public counter shown on the welcome screen."""
    total = await responses().count_documents({})
    return {"total": total}
