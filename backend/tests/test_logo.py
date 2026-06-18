"""
Tests del feature f08: Project Branding (upload/delete logo del proyecto).
"""
import io
import os
import secrets
import uuid

import pytest
import pytest_asyncio
from PIL import Image
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.database import close_db


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_png_bytes(width: int = 64, height: int = 64) -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=(255, 0, 0))
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_pdf_bytes() -> bytes:
    return b"%PDF-1.4\n%fake pdf content for testing\n%%EOF"


def _make_corrupt_image() -> bytes:
    """
    Bytes con un magic valido (PNG) pero contenido invalido.
    Asi detect_mime() lo acepta como image/png, pero compress_to_webp falla
    y se devuelve 422 UPLOAD_CORRUPT.
    """
    return b"\x89PNG\r\n\x1a\n" + b"\x00" * 50 + b"corrupt content"


def _build_test_app(upload_dir: str):
    """Construye una nueva FastAPI app con handlers y la instala en app.main."""
    from fastapi import FastAPI
    from fastapi.exceptions import RequestValidationError
    from fastapi.staticfiles import StaticFiles
    from starlette.exceptions import HTTPException as StarletteHTTPException
    import socketio

    from app.core.errors import (
        http_exception_handler,
        validation_exception_handler,
    )
    from app.core.cors import DynamicCORSMiddleware
    from app.core.security_headers import SecurityHeadersMiddleware
    from app.sockets.server import sio
    import app.sockets.events  # noqa: F401
    from app.api.v1.router import router as v1_router

    test_app = FastAPI(debug=True)
    test_app.add_middleware(DynamicCORSMiddleware)
    test_app.add_middleware(SecurityHeadersMiddleware)
    test_app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    test_app.add_exception_handler(RequestValidationError, validation_exception_handler)
    test_app.include_router(v1_router, prefix="/api/v1")
    test_app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

    import app.main as main_module
    main_module.app = test_app
    main_module.socket_app = socketio.ASGIApp(sio, other_asgi_app=test_app)

    return test_app


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def test_env(tmp_path, monkeypatch):
    """
    Crea DB y uploads en directorio temporal, configura settings, corre
    migraciones y construye una test_app. Devuelve { app, db_path, upload_dir }.
    """
    db_path = tmp_path / "test.db"
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    monkeypatch.setattr(settings, "DATABASE_URL", str(db_path))
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(upload_dir))

    # Cerrar DB singleton si existe
    await close_db()
    # Reset rate limiter
    import app.core.rate_limit as rl
    rl._buckets.clear()

    # Migraciones
    from app.database import run_migrations
    await run_migrations()

    # App
    test_app = _build_test_app(str(upload_dir))

    yield {"app": test_app, "db_path": str(db_path), "upload_dir": str(upload_dir)}

    # Cleanup
    await close_db()


@pytest_asyncio.fixture
async def current_app(test_env):
    return test_env["app"]


@pytest_asyncio.fixture
async def project_with_admin(test_env):
    """
    Crea proyecto + admin via /setup contra la test_app.
    Devuelve (project_id, api_key, token).
    """
    app = test_env["app"]
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/v1/setup",
            json={
                "name": "Test Project",
                "admin_email": "admin@example.com",
                "admin_username": "testadmin",
                "admin_password": "supersecret123",
                "language": "en",
            },
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        api_key = data["api_key"]
        project_id = data["project_id"]

        login = await ac.post(
            "/api/v1/auth/login",
            json={
                "email": "admin@example.com",
                "password": "supersecret123",
                "api_key": api_key,
            },
        )
        assert login.status_code == 200, login.text
        token = login.json()["access_token"]

    return project_id, api_key, token


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

async def test_upload_logo_valid_admin_returns_200(current_app, project_with_admin):
    project_id, _api_key, token = project_with_admin

    png_bytes = _make_png_bytes()
    async with AsyncClient(
        transport=ASGITransport(app=current_app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/v1/projects/me/logo",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("logo.png", png_bytes, "image/png")},
        )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "logo_url" in data
    assert data["logo_url"].startswith(f"/uploads/{project_id}/branding/logo-")
    assert data["logo_url"].endswith(".webp")


async def test_upload_logo_without_admin_token_returns_401(current_app, project_with_admin):
    _project_id, _api_key, _ = project_with_admin

    png_bytes = _make_png_bytes()
    async with AsyncClient(
        transport=ASGITransport(app=current_app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/v1/projects/me/logo",
            files={"file": ("logo.png", png_bytes, "image/png")},
        )
    assert resp.status_code == 401
    body = resp.json()
    assert body["error"]["code"] in ("AUTH_MISSING_TOKEN", "AUTH_TOKEN_INVALID")


async def test_upload_logo_too_large_returns_413(current_app, project_with_admin):
    _project_id, _api_key, token = project_with_admin

    # Generar JPG > 2 MB (JPG no se comprime tanto como PNG, garantizando tamano)
    import random
    rng = random.Random(42)
    big_buf = io.BytesIO()
    img = Image.new("RGB", (4000, 4000))
    pixels = img.load()
    for x in range(0, 4000):
        for y in range(0, 4000):
            pixels[x, y] = (rng.randint(0, 255), rng.randint(0, 255), rng.randint(0, 255))
    img.save(big_buf, format="JPEG", quality=100)
    big_bytes = big_buf.getvalue()
    assert len(big_bytes) > 2 * 1024 * 1024, f"JPG no es suficientemente grande: {len(big_bytes)}"

    async with AsyncClient(
        transport=ASGITransport(app=current_app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/v1/projects/me/logo",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("big.jpg", big_bytes, "image/jpeg")},
        )
    assert resp.status_code == 413
    assert resp.json()["error"]["code"] == "UPLOAD_TOO_LARGE"


async def test_upload_logo_invalid_mime_returns_415(current_app, project_with_admin):
    _project_id, _api_key, token = project_with_admin

    pdf_bytes = _make_pdf_bytes()
    async with AsyncClient(
        transport=ASGITransport(app=current_app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/v1/projects/me/logo",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("doc.pdf", pdf_bytes, "application/pdf")},
        )
    assert resp.status_code == 415
    assert resp.json()["error"]["code"] == "UPLOAD_TYPE_NOT_SUPPORTED"


async def test_upload_logo_corrupt_image_returns_422(current_app, project_with_admin):
    _project_id, _api_key, token = project_with_admin

    corrupt = _make_corrupt_image()
    async with AsyncClient(
        transport=ASGITransport(app=current_app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/v1/projects/me/logo",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("fake.png", corrupt, "image/png")},
        )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "UPLOAD_CORRUPT"


async def test_delete_logo_existing_returns_200(current_app, project_with_admin):
    _project_id, _api_key, token = project_with_admin

    png_bytes = _make_png_bytes()
    async with AsyncClient(
        transport=ASGITransport(app=current_app), base_url="http://test"
    ) as ac:
        up = await ac.post(
            "/api/v1/projects/me/logo",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("logo.png", png_bytes, "image/png")},
        )
        assert up.status_code == 200

        delete = await ac.delete(
            "/api/v1/projects/me/logo",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert delete.status_code == 200
    assert delete.json()["logo_url"] is None


async def test_delete_logo_without_existing_returns_404(current_app, project_with_admin):
    _project_id, _api_key, token = project_with_admin

    async with AsyncClient(
        transport=ASGITransport(app=current_app), base_url="http://test"
    ) as ac:
        resp = await ac.delete(
            "/api/v1/projects/me/logo",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "LOGO_NOT_FOUND"


async def test_upload_then_reupload_replaces_old_file(current_app, project_with_admin):
    project_id, _api_key, token = project_with_admin

    async with AsyncClient(
        transport=ASGITransport(app=current_app), base_url="http://test"
    ) as ac:
        up1 = await ac.post(
            "/api/v1/projects/me/logo",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("a.png", _make_png_bytes(), "image/png")},
        )
        assert up1.status_code == 200
        first_url = up1.json()["logo_url"]

        up2 = await ac.post(
            "/api/v1/projects/me/logo",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("b.png", _make_png_bytes(100, 100), "image/png")},
        )
        assert up2.status_code == 200
        second_url = up2.json()["logo_url"]

    assert first_url != second_url
    assert first_url.startswith(f"/uploads/{project_id}/branding/")
    assert second_url.startswith(f"/uploads/{project_id}/branding/")


async def test_idor_admin_cannot_affect_other_project_logo(test_env, project_with_admin):
    """
    IDOR test: el endpoint usa el project_id del JWT. Creamos un segundo
    proyecto directo en DB; los archivos de branding/ de B deben
    permanecer vacios.
    """
    from app.database import get_db

    project_id_a, _api_key, token_a = project_with_admin
    upload_dir = test_env["upload_dir"]

    # Crear proyecto B en DB (sin admin)
    project_id_b = str(uuid.uuid4())
    api_key_b = f"sproj_{secrets.token_hex(16)}"
    db = await get_db()
    await db.execute(
        "INSERT INTO projects (id, name, api_key, slug, settings)"
        " VALUES (?, ?, ?, ?, ?)",
        (project_id_b, "Project B", api_key_b, "project-b", "{}"),
    )
    await db.commit()

    # Subir logo en A
    async with AsyncClient(
        transport=ASGITransport(app=test_env["app"]), base_url="http://test"
    ) as ac:
        up = await ac.post(
            "/api/v1/projects/me/logo",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("a.png", _make_png_bytes(), "image/png")},
        )
    assert up.status_code == 200
    a_logo_url = up.json()["logo_url"]
    assert a_logo_url.startswith(f"/uploads/{project_id_a}/branding/")

    # B no debe tener archivos en su branding/
    b_branding_dir = os.path.join(upload_dir, project_id_b, "branding")
    if os.path.isdir(b_branding_dir):
        b_files = os.listdir(b_branding_dir)
        assert len(b_files) == 0, f"B tiene archivos inesperados: {b_files}"

    # GET /me con token de A debe retornar proyecto A, no B
    async with AsyncClient(
        transport=ASGITransport(app=test_env["app"]), base_url="http://test"
    ) as ac:
        me = await ac.get(
            "/api/v1/projects/me",
            headers={"Authorization": f"Bearer {token_a}"},
        )
    assert me.status_code == 200
    assert me.json()["id"] == project_id_a
