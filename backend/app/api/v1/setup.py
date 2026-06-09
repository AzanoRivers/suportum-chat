import json
import secrets
from uuid import uuid4

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, Request

from app.config import settings
from app.core.auth import hash_password
from app.core.rate_limit import check_rate_limit
from app.database import get_db
from app.models.setup import (
    HealthResponse,
    SetupCreateRequest,
    SetupCreateResponse,
    SlugCheckResponse,
)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", version=settings.API_VERSION)


@router.get("/check-slug/{slug}", response_model=SlugCheckResponse)
async def check_slug(
    slug: str,
    db: aiosqlite.Connection = Depends(get_db),
) -> SlugCheckResponse:
    async with db.execute(
        "SELECT id FROM projects WHERE slug = ?",
        (slug,),
    ) as cursor:
        row = await cursor.fetchone()
    return SlugCheckResponse(available=row is None)


@router.post("/create", response_model=SetupCreateResponse, status_code=201)
async def setup_create(
    body: SetupCreateRequest,
    request: Request,
    db: aiosqlite.Connection = Depends(get_db),
) -> SetupCreateResponse:
    client_ip = (
        request.headers.get("CF-Connecting-IP")
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or (request.client.host if request.client else "unknown")
    )

    if not check_rate_limit(f"setup:{client_ip}", 3, 86400):
        raise HTTPException(status_code=429, detail="RATE_LIMITED")

    async with db.execute(
        "SELECT id FROM projects WHERE slug = ?",
        (body.slug,),
    ) as cursor:
        existing = await cursor.fetchone()

    if existing is not None:
        raise HTTPException(status_code=409, detail="SLUG_TAKEN")

    project_id = str(uuid4())
    api_key = f"sproj_{secrets.token_hex(16)}"
    project_settings = json.dumps({"language": body.language})

    await db.execute(
        "INSERT INTO projects (id, name, api_key, slug, settings) VALUES (?, ?, ?, ?, ?)",
        (project_id, body.name, api_key, body.slug, project_settings),
    )

    user_id = str(uuid4())
    hashed = hash_password(body.admin_password)

    await db.execute(
        "INSERT INTO users (id, project_id, email, username, password, role) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, project_id, body.admin_email, body.admin_username, hashed, "admin"),
    )

    await db.commit()

    return SetupCreateResponse(
        api_key=api_key,
        project_id=project_id,
        admin={"user_id": user_id, "username": body.admin_username},
    )
