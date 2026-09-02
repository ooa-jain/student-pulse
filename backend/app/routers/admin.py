import csv
import io
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from .. import instrument
from ..db import responses
from ..schemas import LoginIn, TokenOut
from ..security import create_token, require_admin, verify_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/login", response_model=TokenOut)
async def login(payload: LoginIn):
    if not verify_admin(payload.username, payload.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token, expires_in = create_token(payload.username)
    return TokenOut(
        access_token=token, expires_in=expires_in, username=payload.username
    )


@router.get("/me")
async def me(admin: str = Depends(require_admin)):
    return {"username": admin, "role": "admin"}


def _serialise(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    doc.pop("user_agent", None)
    return doc


async def _facet(pipeline: list) -> list:
    return [d async for d in responses().aggregate(pipeline)]


@router.get("/stats")
async def stats(admin: str = Depends(require_admin)):
    col = responses()
    total = await col.count_documents({})

    if total == 0:
        return {
            "total": 0,
            "today": 0,
            "last7": 0,
            "averages": {
                "usage": 0,
                "dependency": 0,
                "critical": 0,
                "readiness": 0,
                "age": 0,
            },
            "personas": [],
            "departments": [],
            "tools": [],
            "campuses": [],
            "levels": [],
            "semesters": [],
            "durations": [],
            "daily_time": [],
            "timeline": [],
            "usage_items": [
                {"item": q, "mean": 0, "dist": [0] * 5}
                for q in instrument.USAGE_ITEMS
            ],
            "dependency_items": [
                {"item": q, "mean": 0, "dist": [0] * 5}
                for q in instrument.DEPENDENCY_ITEMS
            ],
            "age_bands": [],
            "risk": {"high_dependency": 0, "low_critical": 0, "ai_ready": 0},
        }

    now = datetime.now(timezone.utc)
    start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today = await col.count_documents({"created_at": {"$gte": start_today}})
    last7 = await col.count_documents({"created_at": {"$gte": now - timedelta(days=7)}})

    averages = (
        await _facet(
            [
                {
                    "$group": {
                        "_id": None,
                        "usage": {"$avg": "$usage_score"},
                        "dependency": {"$avg": "$dependency_score"},
                        "critical": {"$avg": "$critical_score"},
                        "readiness": {"$avg": "$readiness"},
                        "age": {"$avg": "$age"},
                    }
                }
            ]
        )
    )[0]
    averages.pop("_id", None)
    averages = {k: round(v or 0, 2) for k, v in averages.items()}

    def count_by(field: str, limit: int | None = None):
        pipe = [
            {"$group": {"_id": f"${field}", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        if limit:
            pipe.append({"$limit": limit})
        return pipe

    personas_raw = await _facet(
        [
            {
                "$group": {
                    "_id": "$persona",
                    "count": {"$sum": 1},
                    "readiness": {"$avg": "$readiness"},
                }
            },
            {"$sort": {"count": -1}},
        ]
    )
    personas = [
        {
            "key": p["_id"],
            "label": instrument.PERSONAS.get(p["_id"], {}).get("name", p["_id"]),
            "color": instrument.PERSONAS.get(p["_id"], {}).get("color", "#5B6B8C"),
            "count": p["count"],
            "pct": round(p["count"] / total * 100, 1),
            "readiness": round(p["readiness"] or 0, 1),
        }
        for p in personas_raw
    ]

    departments = [
        {
            "label": d["_id"],
            "count": d["count"],
            "usage": round(d.get("usage") or 0, 2),
            "critical": round(d.get("critical") or 0, 2),
            "readiness": round(d.get("readiness") or 0, 1),
        }
        for d in await _facet(
            [
                {
                    "$group": {
                        "_id": "$department",
                        "count": {"$sum": 1},
                        "usage": {"$avg": "$usage_score"},
                        "critical": {"$avg": "$critical_score"},
                        "readiness": {"$avg": "$readiness"},
                    }
                },
                {"$sort": {"count": -1}},
            ]
        )
    ]

    tools = [
        {"label": t["_id"], "count": t["count"], "pct": round(t["count"] / total * 100, 1)}
        for t in await _facet(count_by("tool"))
    ]
    durations = [
        {"label": d["_id"], "count": d["count"]} for d in await _facet(count_by("duration"))
    ]
    daily_time = [
        {"label": d["_id"], "count": d["count"]} for d in await _facet(count_by("daily"))
    ]

    def labelled(rows: list) -> list:
        return [
            {
                "label": str(r["_id"]) if r["_id"] not in (None, "") else "Not recorded",
                "count": r["count"],
                "readiness": round(r.get("readiness") or 0, 1),
            }
            for r in rows
        ]

    def count_with_readiness(field: str):
        return [
            {
                "$group": {
                    "_id": f"${field}",
                    "count": {"$sum": 1},
                    "readiness": {"$avg": "$readiness"},
                }
            },
            {"$sort": {"count": -1}},
        ]

    campuses = labelled(await _facet(count_with_readiness("campus")))
    levels = labelled(await _facet(count_with_readiness("level")))
    semesters = sorted(
        labelled(await _facet(count_with_readiness("semester"))),
        key=lambda s: (not s["label"].isdigit(), int(s["label"]) if s["label"].isdigit() else 0),
    )

    timeline = [
        {"date": t["_id"], "count": t["count"]}
        for t in await _facet(
            [
                {
                    "$group": {
                        "_id": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": "$created_at",
                            }
                        },
                        "count": {"$sum": 1},
                    }
                },
                {"$sort": {"_id": 1}},
                {"$limit": 90},
            ]
        )
    ]

    # Item-level means + 1..5 distribution
    async def item_stats(field: str, items: list[str]):
        out = []
        for i, text in enumerate(items):
            agg = await _facet(
                [
                    {
                        "$group": {
                            "_id": None,
                            "mean": {"$avg": {"$arrayElemAt": [f"${field}", i]}},
                        }
                    }
                ]
            )
            dist_raw = await _facet(
                [
                    {
                        "$group": {
                            "_id": {"$arrayElemAt": [f"${field}", i]},
                            "count": {"$sum": 1},
                        }
                    }
                ]
            )
            dist = [0] * 5
            for d in dist_raw:
                v = d["_id"]
                if isinstance(v, int) and 1 <= v <= 5:
                    dist[v - 1] = d["count"]
            out.append(
                {
                    "item": text,
                    "mean": round((agg[0]["mean"] if agg else 0) or 0, 2),
                    "dist": dist,
                }
            )
        return out

    usage_items = await item_stats("usage", instrument.USAGE_ITEMS)
    dependency_items = await item_stats("dependency", instrument.DEPENDENCY_ITEMS)

    age_bands = [
        {"label": a["_id"], "count": a["count"]}
        for a in await _facet(
            [
                {
                    "$bucket": {
                        "groupBy": "$age",
                        "boundaries": [13, 18, 21, 24, 30, 91],
                        "default": "Other",
                        "output": {"count": {"$sum": 1}},
                    }
                }
            ]
        )
    ]
    band_names = {13: "13-17", 18: "18-20", 21: "21-23", 24: "24-29", 30: "30+"}
    age_bands = [
        {"label": band_names.get(a["label"], str(a["label"])), "count": a["count"]}
        for a in age_bands
    ]

    risk = {
        "high_dependency": await col.count_documents({"dependency_score": {"$gte": 4}}),
        "low_critical": await col.count_documents({"critical_score": {"$lt": 3}}),
        "ai_ready": await col.count_documents({"persona": "power"}),
    }

    return {
        "total": total,
        "today": today,
        "last7": last7,
        "averages": averages,
        "personas": personas,
        "departments": departments,
        "tools": tools,
        "campuses": campuses,
        "levels": levels,
        "semesters": semesters,
        "durations": durations,
        "daily_time": daily_time,
        "timeline": timeline,
        "usage_items": usage_items,
        "dependency_items": dependency_items,
        "age_bands": age_bands,
        "risk": risk,
    }


@router.get("/responses")
async def list_responses(
    admin: str = Depends(require_admin),
    q: str = Query("", max_length=120),
    department: str = Query(""),
    persona: str = Query(""),
    campus: str = Query(""),
    level: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=5, le=200),
    sort: str = Query("created_at"),
    order: int = Query(-1),
):
    flt: dict = {}
    if q:
        flt["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"program": {"$regex": q, "$options": "i"}},
            {"department": {"$regex": q, "$options": "i"}},
            {"campus": {"$regex": q, "$options": "i"}},
        ]
    if department:
        flt["department"] = department
    if persona:
        flt["persona"] = persona
    if campus:
        flt["campus"] = campus
    if level:
        flt["level"] = level

    allowed_sort = {
        "created_at",
        "name",
        "age",
        "usage_score",
        "dependency_score",
        "critical_score",
        "readiness",
        "department",
        "campus",
        "level",
        "semester",
    }
    if sort not in allowed_sort:
        sort = "created_at"

    total = await responses().count_documents(flt)
    cursor = (
        responses()
        .find(flt)
        .sort(sort, 1 if order > 0 else -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    items = [_serialise(d) async for d in cursor]
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.delete("/responses/{response_id}")
async def delete_response(response_id: str, admin: str = Depends(require_admin)):
    try:
        oid = ObjectId(response_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Bad id")
    res = await responses().delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"deleted": True}


@router.get("/export.csv")
async def export_csv(
    admin: str = Depends(require_admin),
    anonymise: bool = Query(False, description="Strip names and replace with codes"),
):
    buf = io.StringIO()
    writer = csv.writer(buf)
    header = ["id"]
    if anonymise:
        header.append("respondent_code")
    else:
        header.append("name")
    header += ["age", "department", "program", "level", "semester", "campus"]
    header += [f"usage_{i + 1}" for i in range(len(instrument.USAGE_ITEMS))]
    header += [f"dep_{i + 1}" for i in range(len(instrument.DEPENDENCY_ITEMS))]
    header += [
        "duration",
        "daily",
        "tool",
        "usage_score",
        "dependency_score",
        "critical_score",
        "readiness",
        "persona",
        "xp",
        "best_streak",
        "created_at",
    ]
    writer.writerow(header)

    n = 0
    async for d in responses().find({}).sort("created_at", 1):
        n += 1
        row = [str(d["_id"])]
        row.append(f"R{n:05d}" if anonymise else d.get("name", ""))
        row += [
            d.get("age", ""),
            d.get("department", ""),
            d.get("program", ""),
            d.get("level", ""),
            d.get("semester", ""),
            d.get("campus", ""),
        ]
        usage = d.get("usage", []) or []
        dep = d.get("dependency", []) or []
        row += [usage[i] if i < len(usage) else "" for i in range(len(instrument.USAGE_ITEMS))]
        row += [dep[i] if i < len(dep) else "" for i in range(len(instrument.DEPENDENCY_ITEMS))]
        created = d.get("created_at")
        row += [
            d.get("duration", ""),
            d.get("daily", ""),
            d.get("tool", ""),
            d.get("usage_score", ""),
            d.get("dependency_score", ""),
            d.get("critical_score", ""),
            d.get("readiness", ""),
            d.get("persona", ""),
            d.get("xp", ""),
            d.get("best_streak", ""),
            created.isoformat() if isinstance(created, datetime) else "",
        ]
        writer.writerow(row)

    buf.seek(0)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
    suffix = "anonymised" if anonymise else "full"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="ai-pulse-{suffix}-{stamp}.csv"'
        },
    )
