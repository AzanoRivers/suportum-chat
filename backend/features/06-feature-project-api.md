# 06 — Project API (Settings y Rotación de API Key)

## 1. Objetivo
Endpoints para que el admin del proyecto gestione su configuración:
leer settings, actualizar settings (temas, configuración del widget), y rotar el api_key.

## 2. Endpoints REST (`app/api/v1/projects.py`)

```
GET    /projects/me              # Retorna los datos del proyecto actual (scoped al JWT)
PATCH  /projects/me              # Actualiza settings del proyecto (solo admin)
POST   /projects/me/rotate-key   # Rota el api_key (solo admin)
```

### GET /projects/me — Response
```json
{
  "id": "uuid",
  "name": "string",
  "api_key": "sproj_xxx",
  "slug": "string",
  "settings": {
    "theme": "dark-dragon",
    "language": "es",
    "widget_position": "bottom-right",
    "button_label": "Soporte"
  },
  "plan": "free",
  "is_active": true,
  "created_at": "ISO8601"
}
```

### PATCH /projects/me — Body
```json
{
  "name": "string?",
  "settings": {}     // JSON libre — merge con settings existentes, no reemplazar completo
}
```

### POST /projects/me/rotate-key — Response
```json
{
  "api_key": "sproj_nuevo_uuid",
  "warning": "Actualiza apiKey en todos los sitios donde instalaste el widget."
}
```

## 3. Lógica de Settings
- `settings` se almacena como JSON en la columna `settings TEXT` de `projects`
- Al hacer PATCH: **merge** (no reemplazar): `{...existing_settings, ...new_settings}`
- Campos conocidos del settings: `theme`, `language`, `widget_position`, `button_label`
- El frontend puede añadir campos arbitrarios; el backend no valida el schema

```python
@router.patch("/projects/me")
async def update_project(body: ProjectPatchBody, scope=Depends(require_admin)):
    project = scope["project"]
    existing = json.loads(project["settings"] or "{}")
    if body.settings:
        merged = {**existing, **body.settings}
    else:
        merged = existing

    update_fields = {}
    if body.name:
        update_fields["name"] = body.name
    update_fields["settings"] = json.dumps(merged)
    update_fields["updated_at"] = now_iso()

    set_clause = ", ".join(f"{k} = ?" for k in update_fields)
    await db.execute(
        f"UPDATE projects SET {set_clause} WHERE id = ?",
        list(update_fields.values()) + [project["id"]]
    )
    await db.commit()
```

## 4. Rotación de API Key

```python
@router.post("/projects/me/rotate-key")
async def rotate_api_key(scope=Depends(require_admin)):
    project_id = scope["project"]["id"]
    new_key = f"sproj_{uuid.uuid4().hex}"
    await db.execute(
        "UPDATE projects SET api_key = ?, updated_at = ? WHERE id = ?",
        (new_key, now_iso(), project_id)
    )
    await db.commit()
    return {
        "api_key": new_key,
        "warning": "Actualiza apiKey en todos los sitios donde instalaste el widget."
    }
```

**Efecto de la rotación**: todos los widgets conectados con el namespace viejo serán rechazados
al próximo reconnect (el namespace usa el api_key antiguo que ya no existe en la DB). Es comportamiento intencional.

## 5. Seguridad

- [ ] `require_admin` en PATCH y POST rotate-key
- [ ] `get_scoped_project()` garantiza que el admin solo ve su propio proyecto
- [ ] Al construir `SET clause` de UPDATE: nunca usar f-strings con inputs del usuario
- [ ] `api_key` en respuesta solo en `/projects/me` y `/rotate-key` — nunca en listas

## 6. Desarrollo — Pasos

1. Implementar `app/api/v1/projects.py`
2. Helper `json_merge(base, update)` para el merge de settings
3. Registrar router
4. Probar:
   - Admin lee su proyecto → ve settings actuales
   - Admin actualiza theme → settings se hace merge correctamente
   - Admin rota api_key → widget con api_key viejo es rechazado en próxima conexión

## 7. Auditoría y Revisión de Errores

### 7.1 Checklist de Seguridad
- [ ] No-admin recibe `403` en PATCH y rotate-key
- [ ] El `project_id` del JWT limita qué proyecto puede verse/modificarse
- [ ] SQL en UPDATE usa parámetros `?`, no f-strings con valores del usuario

### 7.2 Checklist de Funcionalidad
- [ ] Settings merge: enviar `{ theme: "light-clean" }` no borra `language`
- [ ] Rotación de api_key: nuevo key tiene formato `sproj_<hex>`
- [ ] Rotación invalida namespace viejo en Socket.IO

## 8. Criterios de Aprobación (Done)
- [ ] GET retorna settings del proyecto incluyendo api_key
- [ ] PATCH hace merge de settings (no reemplaza)
- [ ] Rotate-key genera nuevo api_key; el viejo ya no funciona en Socket.IO
- [ ] Non-admin recibe 403 en endpoints protegidos
- [ ] Reviewer confirma APPROVED
