from uuid import uuid4
from sqlite3 import IntegrityError

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, Request, Response

from app.config import settings
from app.core.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.core.guards import get_scoped_project
from app.core.rate_limit import check_rate_limit
from app.database import get_db
from app.models.auth import LoginRequest, LoginResponse, MeResponse, RegisterRequest

router = APIRouter()


async def _resolve_project(api_key: str, db: aiosqlite.Connection) -> str:
    """Devuelve project_id dado un api_key, o lanza 401."""
    async with db.execute(
        "SELECT id FROM projects WHERE api_key = ? AND is_active = 1",
        (api_key,),
    ) as cur:
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="AUTH_INVALID_CREDENTIALS")
    return row[0]


@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    response: Response,
    db: aiosqlite.Connection = Depends(get_db),
) -> LoginResponse:
    project_id = await _resolve_project(body.api_key, db)

    async with db.execute(
        "SELECT id, password, role FROM users WHERE email = ? AND project_id = ? AND is_active = 1",
        (body.email, project_id),
    ) as cursor:
        user = await cursor.fetchone()

    if user is None or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="AUTH_INVALID_CREDENTIALS")

    payload = {
        "sub": user["id"],
        "project_id": project_id,
        "role": user["role"],
    }
    access_token = create_access_token(payload, settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token = create_refresh_token(payload)

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/api/v1/auth/refresh",
    )

    return LoginResponse(
        access_token=access_token,
        role=user["role"],
        user_id=user["id"],
        project_id=project_id,
    )


@router.post("/register", response_model=LoginResponse, status_code=201)
async def register(
    body: RegisterRequest,
    request: Request,
    response: Response,
    db: aiosqlite.Connection = Depends(get_db),
) -> LoginResponse:
    client_ip = (
        request.headers.get("CF-Connecting-IP")
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or (request.client.host if request.client else "unknown")
    )
    if not check_rate_limit(f"register:{client_ip}", 10, 3600):
        raise HTTPException(status_code=429, detail="RATE_LIMITED")

    project_id = await _resolve_project(body.api_key, db)

    hashed = hash_password(body.password)
    user_id = str(uuid4())

    try:
        await db.execute(
            "INSERT INTO users (id, project_id, email, username, password, role) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, project_id, body.email, body.username, hashed, "client"),
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

    payload = {"sub": user_id, "project_id": project_id, "role": "client"}
    access_token = create_access_token(payload, settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token = create_refresh_token(payload)

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/api/v1/auth/refresh",
    )

    return LoginResponse(
        access_token=access_token,
        role="client",
        user_id=user_id,
        project_id=project_id,
    )


@router.post("/refresh", response_model=LoginResponse)
async def refresh(
    request: Request,
    response: Response,
    db: aiosqlite.Connection = Depends(get_db),
) -> LoginResponse:
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="AUTH_REFRESH_EXPIRED")

    payload = decode_token(token)

    user_id: str = payload.get("sub", "")
    project_id: str = payload.get("project_id", "")

    async with db.execute(
        "SELECT id, role FROM users WHERE id = ? AND project_id = ? AND is_active = 1",
        (user_id, project_id),
    ) as cursor:
        user = await cursor.fetchone()

    if user is None:
        raise HTTPException(status_code=401, detail="AUTH_TOKEN_INVALID")

    new_payload = {"sub": user_id, "project_id": project_id, "role": user["role"]}
    new_access_token = create_access_token(new_payload, settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    return LoginResponse(
        access_token=new_access_token,
        role=user["role"],
        user_id=user_id,
        project_id=project_id,
    )


@router.post("/logout", status_code=204)
async def logout(response: Response) -> None:
    response.delete_cookie(
        key="refresh_token",
        path="/api/v1/auth/refresh",
        httponly=True,
        secure=True,
        samesite="none",
    )


@router.get("/me", response_model=MeResponse)
async def me(
    scoped: dict = Depends(get_scoped_project),
    db: aiosqlite.Connection = Depends(get_db),
) -> MeResponse:
    user_id: str = scoped["user_id"]
    project_id: str = scoped["project"]["id"]

    async with db.execute(
        "SELECT username FROM users WHERE id = ? AND project_id = ?",
        (user_id, project_id),
    ) as cursor:
        user = await cursor.fetchone()

    if user is None:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")

    return MeResponse(
        user_id=user_id,
        role=scoped["role"],
        project_id=project_id,
        username=user["username"],
    )
