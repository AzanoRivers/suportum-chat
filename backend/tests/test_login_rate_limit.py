"""
Tests del hotfix de seguridad: rate limit en POST /api/v1/auth/login.

Cubre:
- 5 intentos con password incorrecta contra la misma cuenta bloquean el 6to
  intento con 429, aunque la password del 6to intento sea correcta.
- Un login exitoso no cuenta para el limite de la cuenta.
- El limite de cuenta es independiente por email/proyecto.
- El limite por IP dispara 429 al superar 30 intentos en la ventana,
  independientemente de las cuentas usadas.
"""
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.database import close_db


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


async def _create_project_with_user(app, email: str = "user@example.com", password: str = "supersecret123"):
    """Crea un proyecto + admin via /setup y devuelve (api_key, project_id)."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/api/v1/setup",
            json={
                "name": "Test Project",
                "admin_email": email,
                "admin_username": "testadmin",
                "admin_password": password,
                "language": "en",
            },
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
    return data["api_key"], data["project_id"]


async def test_five_failed_attempts_block_sixth_even_with_correct_password(current_app):
    api_key, _project_id = await _create_project_with_user(current_app)
    email = "user@example.com"
    correct_password = "supersecret123"

    async with AsyncClient(
        transport=ASGITransport(app=current_app), base_url="http://test"
    ) as ac:
        for _ in range(5):
            resp = await ac.post(
                "/api/v1/auth/login",
                json={"email": email, "password": "wrongpassword", "api_key": api_key},
            )
            assert resp.status_code == 401
            assert resp.json()["error"]["code"] == "AUTH_INVALID_CREDENTIALS"

        blocked = await ac.post(
            "/api/v1/auth/login",
            json={"email": email, "password": correct_password, "api_key": api_key},
        )
    assert blocked.status_code == 429
    assert blocked.json()["error"]["code"] == "RATE_LIMITED"


async def test_successful_login_does_not_count_against_account_limit(current_app):
    api_key, _project_id = await _create_project_with_user(current_app)
    email = "user@example.com"
    password = "supersecret123"

    async with AsyncClient(
        transport=ASGITransport(app=current_app), base_url="http://test"
    ) as ac:
        for _ in range(10):
            resp = await ac.post(
                "/api/v1/auth/login",
                json={"email": email, "password": password, "api_key": api_key},
            )
            assert resp.status_code == 200, resp.text


async def test_account_limit_is_independent_per_email(current_app):
    api_key, _project_id = await _create_project_with_user(current_app, email="account_a@example.com")

    async with AsyncClient(
        transport=ASGITransport(app=current_app), base_url="http://test"
    ) as ac:
        # Registrar segunda cuenta en el mismo proyecto
        register_b = await ac.post(
            "/api/v1/auth/register",
            json={
                "email": "account_b@example.com",
                "username": "userb",
                "password": "supersecret123",
                "api_key": api_key,
            },
        )
        assert register_b.status_code == 201, register_b.text

        # Bloquear cuenta A con 5 intentos fallidos
        for _ in range(5):
            resp = await ac.post(
                "/api/v1/auth/login",
                json={"email": "account_a@example.com", "password": "wrongpassword", "api_key": api_key},
            )
            assert resp.status_code == 401

        blocked_a = await ac.post(
            "/api/v1/auth/login",
            json={"email": "account_a@example.com", "password": "supersecret123", "api_key": api_key},
        )
        assert blocked_a.status_code == 429

        # Cuenta B no debe estar afectada
        login_b = await ac.post(
            "/api/v1/auth/login",
            json={"email": "account_b@example.com", "password": "supersecret123", "api_key": api_key},
        )
    assert login_b.status_code == 200, login_b.text


async def test_ip_limit_blocks_after_30_attempts_regardless_of_account(current_app):
    api_key, _project_id = await _create_project_with_user(current_app, email="ip_test@example.com")

    async with AsyncClient(
        transport=ASGITransport(app=current_app), base_url="http://test"
    ) as ac:
        # Usar distintos emails inexistentes para no chocar con el limite de cuenta (5)
        for i in range(30):
            resp = await ac.post(
                "/api/v1/auth/login",
                json={
                    "email": f"nonexistent{i}@example.com",
                    "password": "whatever",
                    "api_key": api_key,
                },
            )
            assert resp.status_code == 401

        blocked = await ac.post(
            "/api/v1/auth/login",
            json={"email": "yet-another@example.com", "password": "whatever", "api_key": api_key},
        )
    assert blocked.status_code == 429
    assert blocked.json()["error"]["code"] == "RATE_LIMITED"
