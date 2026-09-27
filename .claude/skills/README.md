# Skills Directory — Suportum Harness

Este directorio contiene skills para Claude Code que potencian los agentes especializados.
Las skills siguen el estándar abierto **[Agent Skills (agentskills.io)](https://agentskills.io)**
implementado por Claude Code.

## Estructura CORRECTA (según docs oficiales)

Cada skill es un **directorio** con un archivo `SKILL.md` como entrypoint:

```
.claude/skills/
  ├── README.md                ← este archivo
  ├── tailwind-v4/
  │   └── SKILL.md             ← skill para Tailwind CSS v4
  ├── atomic-design-react/
  │   └── SKILL.md             ← skill para Atomic Design
  ├── ios-mobile-first/
  │   └── SKILL.md             ← skill para iOS Safari + mobile-first
  ├── zustand-patterns/
  │   └── SKILL.md             ← skill para Zustand v5
  ├── socketio-client/
  │   └── SKILL.md             ← skill para Socket.IO v4 client
  └── typescript-strict/
      └── SKILL.md             ← skill para TypeScript strict
```

> ⚠️ NO poner archivos `.md` sueltos directamente en `.claude/skills/`.
> Cada skill DEBE ser un directorio con su `SKILL.md` adentro.
> El nombre del directorio es el nombre de la skill (a menos que `name:` esté en el frontmatter).

## Skills incluidas en este proyecto

| Skill | Agente | Descripción |
|---|---|---|
| `tailwind-v4` | team-uiux | @theme tokens, clases nativas, Dragon UI |
| `atomic-design-react` | team-uiux | Jerarquía atoms/molecules/organisms |
| `ios-mobile-first` | team-uiux | 100dvh, webkit, touch targets |
| `zustand-patterns` | team-logic | Stores con Immer, persist, getState() |
| `socketio-client` | team-logic | Conexión tipada, event map, cleanup |
| `typescript-strict` | team-logic | Discriminated unions, generics, no-any |

## Cómo se cargan automáticamente

En el frontmatter de cada agente team:

```yaml
---
name: team-uiux
skills:
  - tailwind-v4
  - atomic-design-react
  - ios-mobile-first
---
```

Claude Code inyecta el contenido completo de cada `SKILL.md` en el contexto del agente al inicio.
Las skills se invocan automáticamente cuando son relevantes, o con `/skill-name`.

## Cómo añadir skills externas (agentskills.io / skills.sh)

1. Encontrar una skill en [agentskills.io](https://agentskills.io) o similar
2. Crear el directorio: `mkdir .claude/skills/<nombre>`
3. Copiar el contenido como `.claude/skills/<nombre>/SKILL.md`
4. Añadir el nombre al frontmatter `skills:` del agente que la necesita
5. Claude Code detecta los cambios automáticamente (live reload)

## Nota

Las skills son **contexto adicional especializado**. En caso de conflicto con las reglas
en `.claude/agents/*.md` o `features/fundation-suportum-plan.md`, siempre prevalecen los
archivos de agente y el plan maestro.

