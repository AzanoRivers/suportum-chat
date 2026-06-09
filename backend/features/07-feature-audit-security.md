# 07 — Auditoría de Seguridad Backend

## 1. Objetivo
Revisión exhaustiva de seguridad de todo el backend antes de ir a producción:
aislamiento multi-tenant, IDOR, inyección SQL, CORS, errores, rate limiting, headers.

## 2. Vectores de Ataque — Checklist Completo

### 2.1 Aislamiento Multi-Tenant
- [ ] Buscar `WHERE id = ?` sin `AND project_id = ?` → bug IDOR garantizado
- [ ] Grep en todos los archivos `*.py`: `fetchone.*WHERE id` sin `project_id`
- [ ] Ningún endpoint acepta `project_id` como query param o body field del usuario
- [ ] El `project_id` viene SIEMPRE del JWT, nunca del request del cliente

### 2.2 SQL Injection
- [ ] Grep en `*.py`: ninguna f-string contiene variables de usuario en SQL
- [ ] Patrón prohibido: `f"WHERE username = '{username}'"` o similar
- [ ] Todo parámetro del usuario va como `?` en la query
- [ ] Cláusulas dinámicas (`SET key = ?`) se construyen desde nombres fijos, no inputs

### 2.3 Autenticación y JWT
- [ ] Access token: expiración máxima 15 minutos
- [ ] Refresh token: cookie `HttpOnly; Secure; SameSite=none; path=/api/v1/auth/refresh`
- [ ] `decode_token()` verifica firma y expiración en cada request
- [ ] Socket.IO `on_connect` verifica `jwt.project_id == namespace_project_id`
- [ ] `SECRET_KEY` sin valor por defecto en código — falla si no está en `.env`

### 2.4 CORS
- [ ] `DynamicCORSMiddleware` retorna el `Origin` recibido (no `*`) con `Allow-Credentials: true`
- [ ] Preflight OPTIONS retorna correctamente con 204
- [ ] Cookie de refresh llega en cross-origin (probar desde un dominio diferente)

### 2.5 Upload de Imágenes
- [ ] MIME por magic bytes (no por extensión del archivo)
- [ ] Nombre en disco es UUID, no el nombre original
- [ ] `safe_upload_path` rechaza path traversal (`../`)
- [ ] Videos rechazados con `415`
- [ ] Archivo > MAX_SIZE rechazado con `413` ANTES de procesar con Pillow

### 2.6 Rate Limiting
- [ ] `POST /setup/create`: max 3/IP/24h
- [ ] `message:send` Socket.IO: max 30/user/60s
- [ ] Rate limiter vive en memoria → se resetea al reiniciar. Documentado.

### 2.7 Security Headers
- [ ] `X-Content-Type-Options: nosniff` presente en todas las respuestas
- [ ] `X-Frame-Options: DENY` presente
- [ ] Sin `X-XSS-Protection` (obsoleto y peligroso)

### 2.8 Exposición de Información Interna
- [ ] Stack traces no llegan al cliente (solo a logs)
- [ ] `password` nunca en respuestas de usuarios
- [ ] `SECRET_KEY` nunca en logs ni respuestas
- [ ] `unhandled_exception_handler` loga completo pero retorna `INTERNAL_ERROR` opaco

### 2.9 Permisos por Rol
- [ ] Client no puede acceder a `GET /users` (lista de todos los usuarios)
- [ ] Client no puede acceder a rooms `orders:board`
- [ ] Agent no puede cambiar rol de otro usuario
- [ ] Admin de proyecto A no puede ver datos de proyecto B

### 2.10 Input Validation
- [ ] `title` de ticket/orden: max chars validado
- [ ] `content` de mensaje: max 4000 chars (`MESSAGE_TOO_LONG`)
- [ ] `room_id` formato válido antes de hacer join (`INVALID_ROOM_ID`)
- [ ] Emails validados con regex o Pydantic `EmailStr`

## 3. Herramientas de Verificación

### Grep de seguridad (PowerShell)
```powershell
# Buscar f-strings en SQL (potencial SQLi)
Select-String -Path "backend\app\**\*.py" -Pattern 'f".*WHERE|f".*INSERT|f".*UPDATE|f".*DELETE' -Recurse

# Buscar WHERE sin project_id
Select-String -Path "backend\app\**\*.py" -Pattern 'WHERE id\s*=' -Recurse

# Buscar password en respuestas
Select-String -Path "backend\app\**\*.py" -Pattern '"password"' -Recurse

# Buscar SECRET_KEY hardcodeada
Select-String -Path "backend\app\**\*.py" -Pattern 'SECRET_KEY\s*=\s*"' -Recurse
```

### Test manual de CORS
```bash
curl -v -H "Origin: https://mysite.com" -H "Authorization: Bearer <token>" \
  https://chat.azanolabs.com/api/v1/auth/me
# Response debe incluir: Access-Control-Allow-Origin: https://mysite.com
```

### Test de IDOR
```bash
# Con token de proyecto A, intentar leer ticket de proyecto B
curl -H "Authorization: Bearer <token_proyecto_A>" \
  http://localhost:8001/api/v1/tickets/<ticket_id_proyecto_B>
# Debe retornar 404, no 200
```

## 4. Performance Básica

- [ ] Queries de listado tienen índices: `idx_messages_project_room`, `idx_tickets_project`, etc.
- [ ] La migración inicial crea todos los índices
- [ ] No hay N+1 queries: usar JOINs donde sea necesario (ej: messages con username del sender)
- [ ] `compress_to_webp` corre en `asyncio.to_thread()` — no bloquea el event loop

## 5. Logging

- [ ] Formato: `%(asctime)s [%(levelname)s] %(name)s — %(message)s`
- [ ] `logger.exception()` en todos los 5xx con traceback completo
- [ ] `logger.warning()` en 4xx
- [ ] NUNCA loguear: password, token JWT, email, contenido de mensajes

## 6. Desarrollo — Pasos

1. Ejecutar greps de seguridad listados en sección 3
2. Para cada finding: corregir y volver a correr el grep
3. Test manual de IDOR con 2 proyectos diferentes
4. Test manual de CORS desde un origen externo
5. Verificar headers de seguridad con `curl -v`
6. Verificar rate limit: enviar 31 mensajes en 60s → el 31 debe ser rechazado
7. Verificar que ningún 5xx expone stack trace al cliente

## 7. Criterios de Aprobación (Done)
- [ ] Cero f-strings en SQL detectadas por grep
- [ ] Cero queries sin `project_id` detectadas por grep
- [ ] IDOR test: ticket de proyecto B retorna 404 con token de proyecto A
- [ ] CORS funciona cross-origin con credentials
- [ ] Security headers presentes en todas las respuestas
- [ ] Rate limit funciona en messages (30/60s)
- [ ] `password` nunca en ninguna respuesta de usuario
- [ ] Reviewer confirma APPROVED
