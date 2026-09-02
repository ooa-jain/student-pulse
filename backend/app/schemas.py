from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator

Likert = Annotated[int, Field(ge=1, le=5)]


class SubmissionIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    age: int = Field(ge=13, le=90)
    department: str = Field(min_length=2, max_length=160)
    program: str = Field(min_length=1, max_length=160)
    level: str = Field(min_length=1, max_length=40)
    semester: str = Field(min_length=1, max_length=8)
    campus: str = Field(min_length=1, max_length=60)
    avatar: str = Field(default="Nova", max_length=40)

    usage: list[Likert] = Field(min_length=5, max_length=5)
    dependency: list[Likert] = Field(min_length=6, max_length=6)

    duration: str
    daily: str
    tool: str

    xp: int = Field(default=0, ge=0, le=1000)
    best_streak: int = Field(default=0, ge=0, le=100)

    @field_validator("name", "program", "department", "level", "semester", "campus")
    @classmethod
    def _strip(cls, v: str) -> str:
        return " ".join(v.split())


class SubmissionOut(BaseModel):
    id: str
    name: str
    usage_score: float
    dependency_score: float
    critical_score: float
    readiness: float
    persona: str
    xp: int
    best_streak: int
    created_at: datetime


class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    username: str
