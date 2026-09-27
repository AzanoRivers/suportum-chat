"""
Tests del feature b09: Validacion de API Key + Dominio.

Cubre GET /api/v1/projects/verify:
- api_key inexistente -> not_found
- api_key con domain = NULL -> bindea y devuelve ready
- api_key con domain igual al del request -> ready
- api_key con domain distinto al del request -> domain_mismatch
- request sin Origin ni Referer contra proyecto con domain = NULL -> domain_mismatch (fail closed)
"""
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.database import close_db, get_db


def _build_test_app():
    from fastapi import FastAPI
    from fastapi.exceptions import RequestValidationError
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

    import app.main as main_module
    main_module.app = test_app
    main_module.socket_app = socketio.ASGIApp(sio, other_asgi_app=test_app)

    return test_app


@pytest_asyncio.fixture
async def test_env(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    monkeypatch.setattr(settings, "DATABASE_URL", str(db_path))
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(upload_dir))

    await close_db()
    import app.core.rate_limit as rl
    rl._buckets.clear()

    from app.database import run_migrations
    await run_migrations()

    test_app = _build_test_app()

    yield {"app": test_app, "db_path": str(db_path), "upload_dir": str(upload_dir)}

    await close_db()


@pytest_asyncio.fixture
async def current_app(test_env):
    return test_env["app"]


@pytest_asyncio.fixture
async def project(test_env):
    """Crea un proyecto (sin domain, via /setup sin header Origin) y devuelve su api_key."""
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
        api_key = resp.json()["api_key"]
    return api_key


async def test_verify_unknown_api_key_returns_not_found(current_app, test_env):
    async with AsyncClient(
        transport=ASGITransport(app=current_app), base_url="http://test"
    ) as ac:
        resp = await ac.get(
            "/api/v1/projects/verify",
            params={"api_key": "sproj_does_not_exist"},
            headers={"Origin": "https://miempresa.com"},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body == {"status": "not_found"}


async def test_verify_null_domain_binds_and_returns_ready(current_app, project):
    async with AsyncClient(
        transport=ASGITransport(app=current_app), base_url="http://test"
    ) as ac:
        resp = await ac.get(
            "/api/v1/projects/verify",
            params={"api_key": project},
            headers={"Origin": "https://miempresa.com"},
        )
    assert resp.status_code == 200
    assert resp.json() == {"status": "ready"}

    # Verificar que el bind quedo guardado en DB
    db = await get_db()
    async with db.execute(
        "SELECT domain FROM projects WHERE api_key = ?", (project,)
    ) as cur:
        row = await cur.fetchone()
    assert row["domain"] == "miempresa.com"


async def test_verify_matching_domain_returns_ready(current_app, project):
    async with AsyncClient(
        transport=ASGITransport(app=current_app), base_url="http://test"
    ) as ac:
        # Primer request bindea el dominio
        first = await ac.get(
            "/api/v1/projects/verify",
            params={"api_key": project},
            headers={"Origin": "https://miempresa.com"},
        )
        assert first.json() == {"status": "ready"}

        # Segundo request desde el mismo dominio (puerto/protocolo distinto,
        # se ignoran a proposito): tambien debe ser ready
        second = await ac.get(
            "/api/v1/projects/verify",
            params={"api_key": project},
            headers={"Origin": "http://miempresa.com:8443"},
        )
    assert second.status_code == 200
    assert second.json() == {"status": "ready"}


async def test_verify_mismatched_domain_returns_domain_mismatch(current_app, project):
    async with AsyncClient(
        transport=ASGITransport(app=current_app), base_url="http://test"
    ) as ac:
        first = await ac.get(
            "/api/v1/projects/verify",
            params={"api_key": project},
            headers={"Origin": "https://miempresa.com"},
        )
        assert first.json() == {"status": "ready"}

        second = await ac.get(
            "/api/v1/projects/verify",
            params={"api_key": project},
            headers={"Origin": "https://otro-sitio-robado.com"},
        )
    assert second.status_code == 200
    assert second.json() == {"status": "domain_mismatch"}


async def test_verify_no_origin_no_referer_against_null_domain_is_fail_closed(
    current_app, project
):
    """Request sin Origin ni Referer contra proyecto con domain = NULL: fail
    closed, nunca ready, nunca bindea "None" como dominio."""
    async with AsyncClient(
        transport=ASGITransport(app=current_app), base_url="http://test"
    ) as ac:
        resp = await ac.get(
            "/api/v1/projects/verify",
            params={"api_key": project},
        )
    assert resp.status_code == 200
    assert resp.json() == {"status": "domain_mismatch"}

    # El dominio no debe haber quedado bindeado
    db = await get_db()
    async with db.execute(
        "SELECT domain FROM projects WHERE api_key = ?", (project,)
    ) as cur:
        row = await cur.fetchone()
    assert row["domain"] is None
