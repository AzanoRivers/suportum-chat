# F04 Users - Implementation Report

**Date:** 2026-06-08
**Status:** IMPLEMENTED - pending Reviewer approval

---

## Files created / modified

| File | Action |
|---|---|
| `app/core/utils.py` | Created - `now_iso()` helper (UTC ISO 8601) |
| `app/api/v1/users.py` | Created - 5 REST endpoints |
| `app/api/v1/router.py` | Modified - registered users router |

---

## Endpoints implemented

### GET /users
- Requires: admin or agent
- Client receives 403 FORBIDDEN
- Returns all users in the project (no password field; explicit column list)
- Ordered by `created_at DESC`

### GET /users/{user_id}
- Admin: can fetch any user in the project
- Agent/Client: can only fetch their own profile; 403 FORBIDDEN if requesting another user
- Returns 404 USER_NOT_FOUND if user does not exist in project

### POST /users
- Admin only; non-admin receives 403 FORBIDDEN
- Validates email, username, and password are non-empty
- Hashes password with `hash_password()` from `app.core.auth`
- `IntegrityError` on duplicate email -> 409 EMAIL_TAKEN
- `IntegrityError` on duplicate username -> 409 USERNAME_TAKEN
- role defaults to "client" if invalid value supplied

### PATCH /users/{user_id}
- Admin can update any field (email, username, password, role, is_active)
- Agent/Client can only update username and password on their own profile
- Any attempt by agent/client to change email, role, or is_active -> 403 FORBIDDEN
- Admin cannot change own role away from "admin" -> 403 FORBIDDEN
- Admin cannot set own is_active to false -> 403 FORBIDDEN
- Empty string values for username/password/email -> 400 VALIDATION_ERROR
- Invalid role value -> 400 VALIDATION_ERROR
- Empty body (no fields) -> 400 VALIDATION_ERROR
- IntegrityError handled: 409 EMAIL_TAKEN or USERNAME_TAKEN

### DELETE /users/{user_id}
- Admin only; non-admin receives 403 FORBIDDEN
- Admin cannot delete (soft-delete) themselves -> 403 FORBIDDEN
- Soft delete: `UPDATE users SET is_active = 0` (no physical DELETE)
- Returns 204 No Content on success
- Returns 404 USER_NOT_FOUND if user not in project

---

## Rules verified

- Python 3.9 compatible: `Optional[X]`, `List[X]` from `typing`; no `X | Y`, no `match`
- No em dash in any text or comments
- Error responses: only `{ "error": { "code": "..." } }` via `error_response()`
- No f-strings in SQL; all queries use `?` placeholders
- All queries include `project_id` in WHERE clause
- No `SELECT *` on users table; explicit field list in `_USER_FIELDS` constant
- Password never included in any response
- Soft delete only: `UPDATE users SET is_active = 0`
- Admin self-protection: verified `user_id == current_user_id` before allowing deactivation or role change
- IntegrityError caught and returns 409 (not 500)

---

## Verification

```
python -c "from app.main import socket_app; print('OK')"
# Output: OK
```

Import chain verified: `app.main` -> `app.api.v1.router` -> `app.api.v1.users` -> all dependencies resolved without errors.
