# AGENTS.md: Mapa del Proyecto Suportum para Agentes

> Leer este archivo primero en toda sesion de desarrollo.

## Archivos Clave

| Archivo | Proposito | Cuando leerlo |
|---------|-----------|---------------|
| `.claude/AGENTS.md` | Este archivo, mapa del proyecto | Siempre primero |
| `CLAUDE.md` (raiz) | Contexto tecnico completo, stack, infra, comandos, workflow | Al inicio de cada sesion |
| `features/fundation-suportum-plan.md` | Plan maestro: arquitectura, decisiones, contrato API | Antes de implementar cualquier feature |
| `backend/features/NN-feature-*.md` | Specs de features backend (una por archivo, id `bNN`) | Antes de implementar o revisar una feature backend |
| `frontend/features/NN-feature-*.md` | Specs de features frontend (una por archivo, id `fNN`) | Antes de implementar o revisar una feature frontend |
| `.claude/CHECKPOINTS.md` | Criterios de done por feature, fuente de verdad del Reviewer | El Reviewer lo consulta siempre |
| `.claude/feature_list.json` | Estado de features (machine-readable), separado en `backend_features`/`frontend_features` | Al decidir que trabajar |
| `.claude/progress/current.md` | Plan vivo de la sesion activa | Al retomar trabajo |
| `.claude/progress/history.md` | Bitacora append-only de sesiones cerradas | Para contexto de decisiones anteriores |
| `context-iphone-bugs.md` (raiz) | Guia de compatibilidad iOS Safari | Antes de escribir cualquier CSS o JSX con estilos |
| `vps_oracle_cloud_context.md` (raiz) | Contexto de infraestructura VPS | Al implementar deploy o config Nginx |
| `.claude/init.ps1` | Script de verificacion del harness | Correr al inicio de toda sesion |

**Importante sobre `features/` en la raiz:** solo contiene el plan maestro
(`fundation-suportum-plan.md`). Ninguna spec de feature individual vive ahi. Cada
feature es backend, frontend, o ambas (como dos specs separadas, una por proyecto,
nunca mezcladas en un mismo archivo). Ver seccion "Separacion Backend/Frontend" mas
abajo.

---

## Roles de Agentes

| Agente | Archivo | Cuando invocarlo |
|--------|---------|------------------|
| Orchestrer | `CLAUDE.md` (el modelo principal) | Es el lider, no se invoca, es quien invoca a los demas |
| Implementer | `.claude/agents/implementer.md` | Para implementar una feature o un ajuste puntual |
| team-uiux | `.claude/agents/team-uiux.md` | Modo B: capa visual en paralelo con team-logic |
| team-logic | `.claude/agents/team-logic.md` | Modo B: capa logica en paralelo con team-uiux |
| Reviewer (completo) | `.claude/agents/reviewer.md` | Gate final, una sola vez, antes de marcar una feature `done` por primera vez |
| Reviewer Light | `.claude/agents/reviewer-light.md` | Rondas de ajuste/tweak sobre una feature que ya paso al menos una vez por el reviewer completo, o hotfixes puntuales chicos. Es la opcion por defecto para esas rondas |

### Reviewer completo vs Reviewer Light

Regla exacta en `CLAUDE.md` seccion "Revision: completa vs rapida". Resumen:

- **Primera vez que una feature nueva se marca `done`:** siempre el reviewer completo,
  sin excepcion.
- **Rondas de ajuste posteriores** (un fix, un tweak visual, una correccion puntual
  sobre algo que el reviewer completo ya aprobo antes): reviewer-light por defecto.
- **Ante la duda:** usar el completo. Es mas lento pero nunca esta mal usarlo de mas,
  el error caro es el otro lado (usar light cuando hacia falta el completo).

### Cuando usar Modo A vs Modo B (para el Implementer)

| Situacion | Modo recomendado |
|---|---|
| Feature es mayormente backend | A: Implementer unico |
| Feature tiene UI chica o secuencial al backend | A: Implementer unico |
| Feature tiene UI y logica client claramente separables | B: Equipos paralelos |
| Hay un bug puntual a parchear | A: Implementer unico |

---

## Flujo de Desarrollo por Feature

### Modo A: Implementer unico

```
1. .\.claude\init.ps1                              -> verifica estado del harness
2. Leer .claude/feature_list.json                  -> identificar proxima feature pending/planned
3. Leer backend/features/<id>.md y/o
   frontend/features/<id>.md                        -> specs de la feature (nunca mezcladas)
4. Actualizar .claude/feature_list.json            -> status: "in_progress"
5. Escribir plan en .claude/progress/current.md    -> modo: "Agente Unico"
6. Invocar Implementer                             -> implementa la feature
7. Implementer escribe .claude/progress/impl_<id>.md
8. Invocar Reviewer completo (primera vez de esta feature) o Reviewer Light (ronda de ajuste)
9. El reviewer que corrio escribe .claude/progress/review_<id>.md
10. Si APPROVED:
    - Actualizar .claude/feature_list.json -> status: "done"
    - Mover el resumen de la sesion a .claude/progress/history.md
    - Limpiar .claude/progress/current.md
11. Si REJECTED:
    - Invocar Implementer de nuevo con el reporte del Reviewer
    - Repetir desde el paso 7, la ronda siguiente usa Reviewer Light salvo que el
      Orchestrer decida que el hallazgo amerita el completo de nuevo
```

### Modo B: Equipos en Paralelo

```
1. .\.claude\init.ps1                              -> verifica estado del harness
2. Leer .claude/feature_list.json                  -> identificar proxima feature
3. Leer backend/features/<id>.md y/o
   frontend/features/<id>.md                        -> specs de la feature
4. Actualizar .claude/feature_list.json            -> status: "in_progress"
5. Escribir contratos en .claude/progress/contracts_<id>.md
                                                     -> tipos, props, callbacks entre capas
6. Escribir plan en .claude/progress/current.md    -> modo: "Equipos Paralelos"
7. Invocar team-uiux [background] + team-logic [background] simultaneamente
8. Esperar ambos reportes:
   - .claude/progress/impl_<id>_uiux.md
   - .claude/progress/impl_<id>_logic.md
9. Reconciliar: verificar que los contratos se cumplen en ambos lados
10. Invocar Reviewer (completo la primera vez, light en rondas de ajuste)
11. El reviewer que corrio escribe .claude/progress/review_<id>.md
12. Si APPROVED: cerrar sesion
13. Si REJECTED: invocar SOLO el equipo que fallo, no ambos
```

---

## Reglas del Harness

1. **Una feature a la vez por proyecto.** `init.ps1` rechaza multiples `in_progress`
   sumando `backend_features` y `frontend_features`.
2. **Estado en disco, no en chat.** Todo output relevante va a archivos en
   `.claude/progress/`.
3. **El Implementer no se autoaprueba.** Siempre pasa por algun Reviewer (completo o light).
4. **Ningun Reviewer edita codigo.** Solo reportan APPROVED o REJECTED con detalle.
5. **Ninguna feature nueva queda `done` sin al menos un pase del reviewer completo.**
   El reviewer-light nunca es, por si solo, el gate que cierra una feature por
   primera vez.
6. **Especs nunca mezcladas.** Una feature full-stack se documenta como dos specs
   separadas (`backend/features/NN-*.md` y `frontend/features/NN-*.md`), nunca como
   un archivo unico full-stack en la raiz de `features/`.
7. **Cada sesion cierra limpio.** `.claude/progress/current.md` se limpia al cerrar,
   `history.md` se actualiza con el resumen.
8. **iOS Safari primero.** Ningun agente escribe CSS o estilos sin haber leido
   `context-iphone-bugs.md`.
9. **Sin versiones hardcodeadas.** Ningun agente escribe versiones en
   `requirements.txt` ni `package.json` manualmente.
10. **Contratos antes de paralelo.** En Modo B, los contratos de interfaz se escriben
    antes de invocar equipos.
11. **Skills en cada sesion.** Cada equipo lee `.claude/skills/README.md` y carga las
    skills relevantes antes de implementar.
12. **Python 3.9 en el VPS.** Todo type hint nuevo del backend usa `Optional[X]`/`Union[X, Y]`
    de `typing`, nunca `X | Y` ni `X | None`.
13. **Cero em dash.** En ningun archivo del repo, codigo, comentario, ni documentacion,
    sin excepcion (regla global del usuario, no solo del harness).

---

## Separacion Backend / Frontend por Feature

Cada feature puede tener implementacion backend (API FastAPI), frontend (React
widget), o ambas. Si tiene ambas, son dos specs separadas (`bNN` y `fNN`), nunca un
archivo full-stack unico. El Implementer lee la spec del lado que le corresponde y
aclara con el Orchestrer si hay ambiguedad de alcance.

| Feature | Backend | Frontend |
|---------|---------|----------|
| 00, Foundation | Si: setup VPS, schema DB, auth JWT, health | Si: setup monorepo, atoms base, ThemeProvider |
| 01, Chat Core / Auth Widget | Si: Socket.IO events, rooms, messages | Si: ChatPanel, MessageList, TypingIndicator, LoginView, SetupWizard |
| 02, Tickets | Si: CRUD tickets API | Si: TicketRow, AgentTickets, ClientTickets |
| 03, Orders | Si: CRUD orders API + status machine | Si: OrderCard, OrdersBoard, panel expandible |
| 04, Users | Si: CRUD users, roles, guards | Si: AdminUsers, UserRow |
| 05, Upload Images | Si: upload seguro, magic bytes, WebP | (cubierto por otros) |
| 06, Project API / Themes | Si: settings, rotacion de api_key | Si: ThemeProvider completo, ThemePicker |
| 07, Audit & Security / Polish | Si: rate limiting, logging | Si: mobile UX, accesibilidad, performance |
| 08, Project Branding | Si: `POST/DELETE /projects/me/logo`, `logo_data` en setup | Si: ProjectLogo, LogoUploader, AdminSettings branding |
| 09, Validacion API Key + Dominio | Si: `GET /projects/verify`, bind de dominio | Si: WidgetShell verifica antes de setup/login, pantallas not_found/blocked |

Ver `.claude/feature_list.json` para el estado real y actualizado de cada una, esta
tabla es solo orientativa de alcance.
