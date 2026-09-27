---
name: ios-mobile-first
description: >
  Reglas de compatibilidad iOS Safari y mobile-first para Suportum. OBLIGATORIO
  leer antes de escribir cualquier CSS, clase Tailwind con propiedades prefijadas,
  o inline styles en React. Cubre 100dvh, webkit prefixes, touch targets, e inputs.
when_to_use: >
  Activar automáticamente cuando se escriban estilos, clases de Tailwind que usen
  backdrop-filter, overflow, position sticky, o cuando se creen inputs o full-height layouts.
---

# iOS Safari + Mobile-First — Reglas Obligatorias

## Full-height layouts

```tsx
// ✅ Correcto — 100dvh con fallback 100vh
<div
  className="flex flex-col"
  style={{ height: '100dvh', minHeight: '100vh' }}
/>

// Tailwind v4 nativo (si el plugin dvh está configurado):
<div className="h-dvh min-h-screen flex flex-col" />

// ❌ Prohibido — falla en iOS Safari < 15.4
<div style={{ height: '100vh' }} />  // sin dvh
```

## Backdrop filter — SIEMPRE doble

```tsx
// En CSS:
.panel {
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  backdrop-filter: blur(12px) saturate(180%);
}

// En React inline styles:
<div
  style={{
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
    backdropFilter: 'blur(12px) saturate(180%)',
  }}
/>

// Con Tailwind (Lightning CSS autoprefija en v4):
<div className="backdrop-blur-md backdrop-saturate-180" />
```

## overflow-x

```css
/* ✅ Correcto */
html, body { overflow-x: hidden; }

/* ❌ Prohibido — rompe iOS Safari < 16 */
html, body { overflow-x: clip; }
```

## Inputs — mínimo 16px para evitar auto-zoom

```tsx
// ✅ Correcto — text-base = 16px
<input className="text-base rounded-xl p-3" />

// ❌ Prohibido — auto-zoom en iOS
<input className="text-sm" />
```

## Touch targets — mínimo 44×44px (Apple HIG)

```tsx
// ✅ min-h-11 = 44px, min-w-11 = 44px
<button className="min-h-11 min-w-11 flex items-center justify-center">
  <X size={20} />
</button>
```

## position: sticky

```tsx
// ✅ El padre DEBE tener overflow: auto o visible
<div className="overflow-auto">
  <div className="sticky top-0 z-10">header</div>
</div>

// ❌ Rompe sticky en iOS Safari
<div className="overflow-hidden">
  <div className="sticky top-0">header</div>
</div>
```

## Safe area insets (notch / home indicator)

```css
/* globals.css */
.widget-container {
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  padding-top: env(safe-area-inset-top, 0px);
}
```

## user-select en React inline styles

```tsx
// ✅ Siempre doble
<div style={{ WebkitUserSelect: 'none', userSelect: 'none' }} />
```
