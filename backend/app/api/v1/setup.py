import asyncio
import json
import logging
import re
import secrets
from sqlite3 import IntegrityError
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
from app.services.email import send_user_welcome
from app.api.v1.projects import process_logo_data_uri

logger = logging.getLogger("suportum")

router = APIRouter()


def _make_slug(name: str) -> str:
    """Genera un slug URL-safe a partir del nombre del proyecto."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")[:40]
    return slug or "project"


@router.get("/branding")
async def get_public_branding(
    db: aiosqlite.Connection = Depends(get_db),
) -> dict:
    """
    Endpoint publico: retorna el logo_url del proyecto (unico proyecto
    instalado). Se usa en LoginView/RegisterView antes de autenticarse.
    Si no hay proyecto o no hay logo, retorna logo_url=null.
    """
    async with db.execute(
        "SELECT name, settings FROM projects WHERE is_active = 1 LIMIT 1"
    ) as cur:
        row = await cur.fetchone()
    if row is None:
        return {"logo_url": None, "project_name": None}
    settings_raw = row["settings"]
    try:
        parsed = json.loads(settings_raw or "{}")
    except (ValueError, TypeError):
        parsed = {}
    value = parsed.get("logo_url")
    logo_url = value if isinstance(value, str) and value else None
    return {"logo_url": logo_url, "project_name": row["name"]}


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


@router.post("", response_model=SetupCreateResponse, status_code=201)
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

    # Resolver slug: usar el enviado o auto-generar desde el nombre
    if body.slug:
        final_slug = body.slug
        async with db.execute(
            "SELECT id FROM projects WHERE slug = ?", (final_slug,)
        ) as cur:
            if await cur.fetchone() is not None:
                raise HTTPException(status_code=409, detail="SLUG_TAKEN")
    else:
        base = _make_slug(body.name)
        final_slug = base
        for _ in range(5):
            async with db.execute(
                "SELECT id FROM projects WHERE slug = ?", (final_slug,)
            ) as cur:
                if await cur.fetchone() is None:
                    break
            final_slug = f"{base[:35]}-{secrets.token_hex(2)}"

    project_id = str(uuid4())
    api_key = f"sproj_{secrets.token_hex(16)}"
    project_settings = json.dumps({"language": body.language})
    user_id = str(uuid4())
    hashed = hash_password(body.admin_password)

    try:
        await db.execute(
            "INSERT INTO projects (id, name, api_key, slug, settings) VALUES (?, ?, ?, ?, ?)",
            (project_id, body.name, api_key, final_slug, project_settings),
        )
        await db.execute(
            "INSERT INTO users (id, project_id, email, username, password, role) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, project_id, body.admin_email, body.admin_username, hashed, "admin"),
        )
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        msg = str(exc).lower()
        if "email" in msg:
            raise HTTPException(status_code=409, detail="EMAIL_TAKEN")
        if "username" in msg:
            raise HTTPException(status_code=409, detail="USERNAME_TAKEN")
        raise HTTPException(status_code=409, detail="INTERNAL_ERROR")

    # Procesar logo (opcional) despues de crear el proyecto para tener su ID
    if body.logo_data:
        try:
            logo_url = await process_logo_data_uri(body.logo_data, project_id)
        except HTTPException:
            # Si falla el procesamiento del logo, no abortamos el setup;
            # el proyecto ya existe. El admin podra subirlo despues.
            logger.warning("No se pudo procesar logo en setup para proyecto %s", project_id)
            logo_url = None
        if logo_url:
            try:
                merged = json.loads(project_settings)
                merged["logo_url"] = logo_url
                await db.execute(
                    "UPDATE projects SET settings = ? WHERE id = ?",
                    (json.dumps(merged), project_id),
                )
                await db.commit()
            except Exception:
                logger.warning("No se pudo guardar logo_url en setup para %s", project_id)

    asyncio.create_task(
        send_user_welcome(
            email=body.admin_email,
            username=body.admin_username,
            password=body.admin_password,
            project_name=body.name,
        )
    )

    return SetupCreateResponse(
        api_key=api_key,
        project_id=project_id,
        admin={"user_id": user_id, "username": body.admin_username},
    )
