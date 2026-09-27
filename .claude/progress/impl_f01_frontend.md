# F01 Frontend Foundation - Implementation Report

## Estado: DONE_WITH_CONCERNS

## Archivos Creados

### Monorepo root
- `frontend/package.json` - root monorepo config con scripts build/typecheck/dev

### Package: suportum-chat
- `frontend/packages/suportum-chat/package.json` - package config con exports map correcto (types primero)
- `frontend/packages/suportum-chat/tsconfig.json` - TS config con `ignoreDeprecations: "6.0"` para TypeScript 6
- `frontend/packages/suportum-chat/tsup.config.ts` - tsup config ESM+CJS+DTS

### Atoms
- `frontend/packages/suportum-chat/src/atoms/Button.tsx` - variantes primary/ghost/danger, min-h-11 min-w-11
- `frontend/packages/suportum-chat/src/atoms/Input.tsx` - text-base obligatorio, error state, min-h-11
- `frontend/packages/suportum-chat/src/atoms/Badge.tsx` - todos los status con tokens de color
- `frontend/packages/suportum-chat/src/atoms/Avatar.tsx` - iniciales uppercase, sizes sm/md/lg
- `frontend/packages/suportum-chat/src/atoms/Spinner.tsx` - animacion CSS, aria-label="Loading"

### Providers
- `frontend/packages/suportum-chat/src/providers/ThemeProvider.tsx` - persiste en localStorage, aplica clase en wrapper div (NO en document.documentElement)

### Templates
- `frontend/packages/suportum-chat/src/templates/FloatingWidget.tsx` - placeholder retorna null, acepta apiKey/apiUrl/position

### Demo App
- `frontend/apps/demo/package.json`
- `frontend/apps/demo/tsconfig.json`
- `frontend/apps/demo/vite.config.ts`
- `frontend/apps/demo/index.html`
- `frontend/apps/demo/src/main.tsx`
- `frontend/apps/demo/src/App.tsx` - placeholder

### Auxiliar
- `frontend/packages/suportum-chat/src/vite-env.d.ts` - tipos para import.meta.env

## Archivos Modificados

- `frontend/packages/suportum-chat/src/atoms/index.ts` - exports descomentados
- `frontend/packages/suportum-chat/src/templates/index.ts` - export FloatingWidget
- `frontend/packages/suportum-chat/src/index.ts` - exports principales del paquete
- `frontend/pnpm-workspace.yaml` - agregado `allowBuilds: esbuild: true` (requerido por pnpm 11)

### Bugfixes en archivos pre-existentes (minimos, sin cambio de API)
- `frontend/packages/suportum-chat/src/i18n/en.ts`:
  - Renombrado `users.profile` (string) a `users.profileMenu` para eliminar clave duplicada (TS1117)
  - Removido `as const` para ampliar el tipo `Translations` y permitir que `es` sea asignable (TS2322)
- `frontend/packages/suportum-chat/src/i18n/es.ts`:
  - Renombrado `users.profile` (string) a `users.profileMenu` (mismo fix que en.ts)
- `frontend/packages/suportum-chat/src/i18n/index.ts` → renombrado a `index.tsx`:
  - El archivo tenia JSX en extension `.ts`. TypeScript requiere `.tsx` para JSX. Contenido sin cambios.

## Resultados de Verificacion

```
pnpm --filter suportum-chat typecheck
$ tsc --noEmit
[exit code 0 - sin errores]

pnpm --filter suportum-chat build
$ tsup
ESM: dist/index.mjs     14.52 KB
CJS: dist/index.js      15.75 KB
DTS: dist/index.d.ts    1.11 KB
[exit code 0 - build exitoso]
```

## Concerns

1. **TypeScript 6.0 instalado**: pnpm instalo typescript@6.0.3 (latest). TypeScript 6 depreco `baseUrl` y requiere `"ignoreDeprecations": "6.0"` en tsconfig para que el DTS build de tsup funcione. Esto es transparente para el codigo pero hay que tenerlo en cuenta si se migra a TypeScript 7.

2. **Bugs en archivos pre-existentes**: Los archivos de i18n tenian 3 errores de TypeScript que impiden typecheck. Se hicieron correcciones minimas preservando la API publica:
   - `users.profile` (string) → `users.profileMenu` en en.ts y es.ts
   - Removed `as const` de en.ts para que el tipo `Translations` sea estructural y no literal
   - Renombrado index.ts → index.tsx por uso de JSX

3. **`users.profileMenu`**: Las features siguientes (F02+) deben usar `t('users.profileMenu')` en lugar de `t('users.profile')` para el label del menu de perfil. El objeto `users.profile.changeUsername` etc. sigue igual.

4. **vite como devDep en suportum-chat**: Se agrego `vite` como devDependencia al paquete para tipos de `import.meta.env`. Es correcto porque api.ts y socket.ts usan `import.meta.env.VITE_*`.
