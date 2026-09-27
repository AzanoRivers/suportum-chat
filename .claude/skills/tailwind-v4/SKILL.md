---
name: tailwind-v4
description: >
  Patrones de Tailwind CSS v4 para Suportum: @theme tokens, clases nativas sobre
  arbitrarias, variantes de temas, y reglas de diseño Dragon UI. Usar cuando se
  escriben estilos Tailwind, globals.css, o tokens del design system.
---

# Tailwind CSS v4 — Dragon UI Patterns

## Estructura de globals.css

```css
@import "tailwindcss";

@theme {
  /* Colores Dragon UI */
  --color-surface-0: #0a0a0f;
  --color-surface-1: #111118;
  --color-surface-2: #1a1a24;
  --color-accent: #00d4ff;
  --color-accent-dim: #0099bb;
  --color-text-primary: #e8eaf0;
  --color-text-secondary: #8892a4;
  --color-border: rgba(255,255,255,0.08);

  /* Radii */
  --radius-widget: 16px;
  --radius-card: 12px;

  /* Tipografía */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Espaciado safe areas mobile */
  --spacing-safe-top: env(safe-area-inset-top, 0px);
  --spacing-safe-bottom: env(safe-area-inset-bottom, 0px);
}

/* Temas — sobrescribir via clase en <html> */
html.theme-light {
  --color-surface-0: #f5f5f7;
  --color-surface-1: #ffffff;
  --color-surface-2: #e8e8ed;
  --color-text-primary: #1d1d1f;
  --color-text-secondary: #6e6e73;
}
```

## Clases nativas — SIEMPRE sobre arbitrarias

```tsx
// ✅ Correcto
<div className="w-2.5 h-3.5 p-1.5 gap-2.5 mt-0.5 mb-0.5" />
<div className="rounded-xl border border-white/10 bg-surface-1" />

// ❌ Prohibido
<div className="w-[10px] h-[14px] p-[6px] gap-[10px]" />
```

## Uso de tokens custom en clases

```tsx
// Con @theme declarado, usar como clases directas:
<div className="bg-surface-0 text-text-primary border-border" />
<div className="text-accent hover:text-accent-dim" />
```

## Variantes condicionales

```tsx
// Responsive con breakpoints nativos
<div className="flex flex-col md:flex-row lg:grid lg:grid-cols-3" />

// Dark/light via clase en html
<div className="bg-surface-0" />  // Cambia automáticamente con theme-light
```
