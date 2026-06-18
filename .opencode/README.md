# opencode (minimax) — Configuración para Suportum

Esta carpeta contiene la configuración agentica para **opencode CLI** (modelo `minimax-m3`),
paralela a la configuración de Claude Code en `.claude/`.

> **Las dos configuraciones son independientes y complementarias.** Claude Code usa
> `.claude/` (formato propio: agents como subagentes con `Agent` tool, skills vía frontmatter).
> opencode usa `.opencode/` (formato opencode: agents en `.opencode/agents/*.md` descubiertos
> automáticamente, skills on-demand via `skill` tool).

---

## Estructura

```
.opencode/
├── opencode.json              # Configuración raíz: provider, modelo default, agents, permisos
├── prompts/
│   └── orchestrer.txt         # Prompt extendido del agent primario "orchestrer"
└── agents/                    # Subagentes descubiertos automáticamente por opencode
    ├── implementer.md
    ├── reviewer.md
    ├── team-uiux.md
    └── team-logic.md
```

> **No es necesario duplicar skills.** opencode busca skills en:
> - `.opencode/skills/<name>/SKILL.md` (este repo)
> - `.claude/skills/<name>/SKILL.md` (este repo, ya existe)
> - `.agents/skills/<name>/SKILL.md` (este repo)
> - `~/.config/opencode/skills/<name>/SKILL.md` (global)
>
> Como `.claude/skills/` ya contiene las 6 skills del proyecto, opencode las descubre
> sin duplicación.

---

## Agents disponibles

| Agent | Modo | Descripción |
|---|---|---|
| `orchestrer` | primary | Líder de desarrollo. Coordina features. Hilo principal: puede invocar subagentes via Task tool. |
| `build` | primary (built-in) | Default de opencode con todos los permisos. No personalizado para Suportum. |
| `plan` | primary (built-in) | Solo análisis, sin ediciones. No personalizado para Suportum. |
| `implementer` | subagent | Implementa features siguiendo specs y checkpoints. |
| `reviewer` | subagent | Valida trabajo del implementer contra CHECKPOINTS.md. No edita código. |
| `team-uiux` | subagent | Capa visual: átomos, moléculas, organismos, CSS. |
| `team-logic` | subagent | Capa lógica: stores, hooks, API client, Socket.IO. |

---

## Cómo usar

### Como Orchestrer (recomendado)

Iniciá opencode en el directorio del proyecto:

```bash
opencode
```

Por default arrancás con el agent `build`. Para usar el `orchestrer` de Suportum:

1. Tab para ciclar entre primary agents hasta llegar a `orchestrer`.
2. O invocá directamente: `@orchestrer` en el prompt.

El `orchestrer` lee `.claude/AGENTS.md`, `.claude/feature_list.json` y coordina igual
que en Claude Code.

### Como subagente

Los subagentes (`implementer`, `reviewer`, `team-uiux`, `team-logic`) se invocan via:

```
@implementer implementá la feature f08 leyendo .claude/feature_list.json
@reviewer revisá el último impl_f08.md
@team-uiux y @team-logic pueden invocarse en paralelo (Modo B)
```

O automáticamente por el `orchestrer` via Task tool.

---

## Permisos

```jsonc
// .opencode/opencode.json (resumen)
"permission": {
  "edit":   "allow",  // el modelo puede editar/crear archivos
  "bash":   "allow",  // el modelo puede correr comandos
  "webfetch": "allow",
  "skill":  "allow"   // el modelo puede cargar skills via skill tool
}
```

Subagentes tienen permisos ajustados:
- `implementer` / `team-uiux` / `team-logic` → `edit: allow`, `bash: allow`
- `reviewer` → `edit: deny`, `bash: allow` (solo lectura + verificación)
- `orchestrer` → acceso total, incluido `task` para invocar subagentes

---

## Skills utilizadas

Las skills del proyecto viven en `.claude/skills/`. opencode las descubre automáticamente:

| Skill | Usada por | Propósito |
|---|---|---|
| `atomic-design-react` | team-uiux | Jerarquía atoms/molecules/organisms |
| `tailwind-v4` | team-uiux | @theme tokens, clases nativas |
| `ios-mobile-first` | team-uiux | 100dvh, webkit, touch targets |
| `zustand-patterns` | team-logic | Stores con Immer, persist |
| `socketio-client` | team-logic | Conexión tipada, event map |
| `typescript-strict` | team-logic | Discriminated unions, generics |

---

## Diferencias con Claude Code

| Aspecto | Claude Code | opencode (minimax) |
|---|---|---|
| Carpeta de config | `.claude/` | `.opencode/` |
| Subagentes | `Agent` tool | `Task` tool (built-in) |
| Skills | Frontmatter `skills:` | `skill` tool (on-demand) |
| Agents discovery | Frontmatter manual | Auto desde `.opencode/agents/*.md` |
| Modo C (Agent Teams) | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | Nativo (no necesita flag) |
| Modelo | Claude Sonnet/Haiku/Opus | `minimax-m3` |
| Parallel agents | Modo B con `Agent` tool | `Task` tool spawn |

**La lógica de orquestación (Modo A/B/C), checkpoints, contratos, historia, y reglas
del proyecto (R1-R4) son idénticas en ambos sistemas.** Solo cambia el formato de
configuración.

---

## Fuente de verdad

> **Los archivos `.claude/agents/*.md` son la fuente de verdad del comportamiento de
> cada agente.** Los archivos `.opencode/agents/*.md` son puertos simplificados que
> referencian a los `.claude/agents/*.md` para detalles completos.

Si hay conflicto entre `.claude/agents/X.md` y `.opencode/agents/X.md`, gana `.claude/`
(es el sistema original). Actualizá ambos al modificar comportamiento.
