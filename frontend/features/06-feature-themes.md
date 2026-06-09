# 06 — Themes Frontend

## 1. Objetivo
Sistema de temas configurables: ThemeProvider ya implementado en F00, aquí se implementa
el selector de temas para el admin, persistencia en el backend (`project.settings.theme`),
y el tema `light-clean` alternativo.

## 2. Componentes a Implementar

### Atoms (extensión)
- `ThemeProvider` ya existe — verificar que aplica correctamente
- `ColorSwatch` — preview de un color del tema

### Molecules
- `ThemeCard` — tarjeta de preview de un tema (miniatura del widget con los colores del tema)
- `ThemeSelector` — grid de ThemeCards para seleccionar

### Organisms
- `AdminSettings` — panel de configuración del proyecto: tema, idioma, nombre del proyecto, rotación de api_key

## 3. Temas Disponibles

| ID | Nombre | Descripción |
|---|---|---|
| `dark-dragon` | Dark Dragon | Fondo casi negro, acento cian. Default. |
| `light-clean` | Light Clean | Fondo blanco/gris claro, acento azul. |

Los temas son clases CSS que sobreescriben los tokens `@theme`. Ver:
- `styles/themes/light-clean.css` (ya creado en F00)

## 4. ThemeSelector UI

### Maquetación
```
┌──────────────────────────────────────┐
│ Tema del Widget                      │
├──────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐   │
│ │ ████████████ │ │ ░░░░░░░░░░░░ │   │
│ │ █ ◉ Chat   █ │ │ ░ ◉ Chat   ░ │   │
│ │ ████████████ │ │ ░░░░░░░░░░░░ │   │
│ │ Dark Dragon  │ │ Light Clean  │   │
│ │    [✓ Activo]│ │  [Seleccionar]   │
│ └──────────────┘ └──────────────┘   │
└──────────────────────────────────────┘
```

### ThemeCard — Preview con los colores del tema
- Miniatura 120x80px que simula el aspecto del widget
- Fondo usando los colores del tema correspondiente (inline styles con los valores hex)
- No aplicar la clase del tema al ThemeCard mismo para no afectar al resto de la UI

```tsx
const THEME_PREVIEWS = {
  'dark-dragon': { bg: '#0a0a0f', surface: '#111118', accent: '#00d4ff', text: '#e8e8f0' },
  'light-clean': { bg: '#f8f8fc', surface: '#ffffff', accent: '#0066cc', text: '#1a1a2e' },
}

function ThemeCard({ themeId, isActive, onSelect }) {
  const colors = THEME_PREVIEWS[themeId]
  return (
    <div
      className="border-2 rounded-md overflow-hidden cursor-pointer"
      style={{ borderColor: isActive ? colors.accent : 'var(--color-border-default)' }}
      onClick={onSelect}
    >
      <div style={{ backgroundColor: colors.bg, padding: '8px' }}>
        <div style={{ backgroundColor: colors.surface, borderRadius: '2px', padding: '4px' }}>
          <div style={{ width: '60%', height: '6px', backgroundColor: colors.accent, borderRadius: '1px' }} />
          <div style={{ width: '80%', height: '4px', backgroundColor: colors.text, opacity: 0.3, marginTop: '4px', borderRadius: '1px' }} />
        </div>
      </div>
      <div style={{ padding: '6px 8px', backgroundColor: 'var(--color-bg-elevated)' }}>
        <span className="text-xs text-text-primary">{THEME_NAMES[themeId]}</span>
      </div>
    </div>
  )
}
```

## 5. AdminSettings Panel

```
┌────────────────────────────────────────┐
│ Configuración del Proyecto             │
├────────────────────────────────────────┤
│ Nombre del proyecto:                   │
│ [Soporte WoW Boosting_______________]  │
│                                        │
│ Tema del Widget:                       │
│ [ThemeCard dark] [ThemeCard light]     │
│                                        │
│ Posición del botón flotante:           │
│ (●) Bottom Right  ( ) Bottom Left      │
│ ( ) Top Right     ( ) Top Left         │
│                                        │
│ Etiqueta del botón:                    │
│ [Soporte___________________________]   │
│                                        │
│          [  Guardar configuración  ]   │
├────────────────────────────────────────┤
│ API Key del proyecto:                  │
│ sproj_xxxxxxxxx...    [📋 Copiar]      │
│                                        │
│ [⚠ Rotar API Key]                     │
└────────────────────────────────────────┘
```

## 6. Hooks

### `hooks/useProjectSettings.ts`
```ts
export function useProjectSettings(apiUrl: string) {
  // Carga settings del proyecto: GET /projects/me
  // updateSettings: PATCH /projects/me { settings: { theme, ... } }
  // rotateApiKey: POST /projects/me/rotate-key
  // Al cambiar tema: también llamar useTheme().setTheme(newTheme)
}
```

## 7. Aplicar Tema al Widget

Cuando el admin cambia el tema:
1. Llamar `PATCH /projects/me` con `{ settings: { theme: 'light-clean' } }`
2. Llamar `useTheme().setTheme('light-clean')` para aplicar inmediatamente
3. El cambio persiste en el backend y se carga al montar via `GET /projects/me`

Al montar el widget, si existe `project.settings.theme` → aplicar ese tema:
```ts
useEffect(() => {
  if (project?.settings?.theme) {
    setTheme(project.settings.theme)
  }
}, [project])
```

## 8. Rotar API Key — Confirmación

Rotar el api_key desconecta todos los widgets actuales. Requiere confirmación:

```tsx
function RotateKeyButton({ onRotate }) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) return (
    <Button variant="danger" onClick={() => setConfirming(true)}>
      Rotar API Key
    </Button>
  )

  return (
    <div className="border border-status-cancelled/30 bg-status-cancelled/10 p-3 rounded-sm">
      <p className="text-sm text-text-primary">
        Esto desconectará todos los widgets activos. ¿Continuar?
      </p>
      <div className="flex gap-2 mt-2">
        <Button variant="danger" onClick={onRotate}>Confirmar rotación</Button>
        <Button variant="ghost" onClick={() => setConfirming(false)}>Cancelar</Button>
      </div>
    </div>
  )
}
```

## 9. Desarrollo — Pasos

1. Verificar `ThemeProvider` en F00 aplicando correctamente
2. Implementar molecules: `ColorSwatch`, `ThemeCard`
3. Implementar `ThemeSelector` organism
4. Implementar `AdminSettings` organism completo
5. Implementar `hooks/useProjectSettings.ts`
6. Integrar `AdminSettings` en `AdminView`
7. Probar: admin cambia tema → cambio se aplica instantáneamente y persiste al recargar

## 10. Auditoría

### 10.1 Checklist de Seguridad
- [ ] Rotación de api_key requiere confirmación explícita
- [ ] `AdminSettings` solo accessible para admin (WidgetShell ya lo garantiza, pero verificar)

### 10.2 Checklist de Funcionalidad
- [ ] Cambio de tema: aplica inmediatamente en la sesión actual
- [ ] Recarga de página: tema del proyecto se carga desde backend
- [ ] Rotación de api_key: nuevo key se muestra y es copiable
- [ ] Guardar configuración: merge correcto de settings (no borra otros campos)

### 10.3 Checklist iOS
- [ ] ThemeCard: touch target adecuado (min 44px)
- [ ] Input de nombre del proyecto: `text-base`

## 11. Criterios de Aprobación (Done)
- [ ] Admin puede cambiar entre dark-dragon y light-clean
- [ ] Tema persiste en el backend y se aplica al recargar
- [ ] API key visible y copiable
- [ ] Rotación de api_key con confirmación funciona
- [ ] Reviewer confirma APPROVED
