# 04 — Users Backend

## 1. Objetivo
CRUD de usuarios scoped al proyecto: listar, crear, actualizar rol, desactivar.
Un admin puede gestionar todos los usuarios del proyecto. Un agent solo puede ver su propio perfil.

## 2. Endpoints REST (`app/api/v1/users.py`)

```
GET    /users                  # admin/agent: lista usuarios del proyecto
GET    /users/{id}             # admin: cualquiera; agent/client: solo su propio perfil
POST   /users                  # admin crea usuario con rol específico
PATCH  /users/{id}             # admin: cambiar role, is_active, username; user: su propio username/password
DELETE /users/{id}             # admin: desactivar (is_active=0), no borrar físicamente
```

### Reglas de acceso
- `GET /users` → admin/agent ven lista; client → `403 FORBIDDEN`
- `GET /users/{id}` → admin accede a cualquiera; client/agent solo `user_id == scope["user_id"]`
- `POST /users` → solo admin
- `PATCH /users/{id}` → admin puede cambiar todo; user puede cambiar su propio `username` y `password`
- `DELETE /users/{id}` → solo admin; un admin no puede desactivarse a sí mismo

### Body POST
```json
{
  "email": "string",
  "username": "string",
  "password": "string",
  "role": "client|agent|admin"
}
```

### Body PATCH
```json
{
  "username": "string?",
  "password": "string?",    // si se envía, re-hashear con bcrypt
  "role": "string?",        // solo admin puede cambiar
  "is_active": "bool?"      // solo admin puede cambiar
}
```

## 3. Respuesta de usuario (sin password)

```json
{
  "id": "uuid",
  "project_id": "uuid",
  "email": "email",
  "username": "string",
  "role": "client|agent|admin",
  "is_active": true,
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

**NUNCA retornar el campo `password` en ninguna respuesta.**

## 4. Queries

```python
# Listar usuarios del proyecto — nunca cruzar proyectos
users = await db.fetchall(
    "SELECT id, project_id, email, username, role, is_active, created_at, updated_at "
    "FROM users WHERE project_id = ? ORDER BY created_at DESC",
    (project_id,)
)

# Crear usuario (admin)
# Verificar UNIQUE(project_id, email) y UNIQUE(project_id, username) antes de INSERT
# Capturar IntegrityError → EMAIL_TAKEN o USERNAME_TAKEN

# Update password
if new_password:
    hashed = hash_password(new_password)
    await db.execute(
        "UPDATE users SET password = ?, updated_at = ? WHERE id = ? AND project_id = ?",
        (hashed, now_iso(), user_id, project_id)
    )
```

## 5. Validaciones de Negocio

- `email` válido (formato)
- `username` 3-30 chars, alfanumérico + guiones
- `password` mínimo 8 chars
- `role` solo `client|agent|admin`
- Un admin no puede cambiar su propio `role` o `is_active` a false (protección contra lockout)
- `email` y `username` únicos dentro del proyecto (no globalmente)

## 6. Seguridad

- [ ] `get_scoped_project()` en todos los endpoints
- [ ] Campo `password` NUNCA en respuestas
- [ ] IDOR: `GET /users/{id}` verifica `id + project_id`
- [ ] Admin no puede bloquear su propia cuenta
- [ ] Al cambiar password: `hash_password()` siempre, nunca guardar plain text
- [ ] `role = "admin"` solo admin puede asignar a otro usuario

## 7. Desarrollo — Pasos

1. Implementar `app/api/v1/users.py`
2. Añadir helper `now_iso()` en `app/core/utils.py`
3. Verificar que `SELECT` nunca incluye el campo `password`
4. Registrar router
5. Probar:
   - Admin crea agent → agent se loguea → agent ve su perfil
   - Admin desactiva usuario → usuario no puede loguearse
   - Agent intenta listar usuarios de otro proyecto → 403

## 8. Auditoría y Revisión de Errores

### 8.1 Checklist de Seguridad
- [ ] `password` ausente en TODAS las respuestas (grep "password" en responses)
- [ ] IDOR protegido: GET /users/{id} filtra por `project_id`
- [ ] Client no puede acceder a GET /users (lista)
- [ ] Un user no puede elevar su propio rol
- [ ] Admin no puede desactivarse a sí mismo

### 8.2 Checklist de Funcionalidad
- [ ] Usuario desactivado (`is_active=0`) recibe `403` al intentar loguearse
- [ ] Crear usuario con email duplicado → `409 EMAIL_TAKEN`
- [ ] Crear usuario con username duplicado → `409 USERNAME_TAKEN`
- [ ] Password update: nuevo password funciona en próximo login

### 8.3 Errores Comunes
- `SELECT *` en lugar de listar campos explícitos → puede filtrar `password` con exclusión pero es propenso a errores; listar campos explícitos siempre
- `IntegrityError` no capturado → retorna `500` en vez de `409`

## 9. Criterios de Aprobación (Done)
- [ ] CRUD completo funciona para admin
- [ ] Agent y client tienen acceso limitado según las reglas
- [ ] `password` nunca aparece en ninguna respuesta
- [ ] Usuario desactivado no puede loguearse
- [ ] Duplicados retornan 409, no 500
- [ ] Reviewer confirma APPROVED
