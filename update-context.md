# Update Context: pnpm y dependencias del Frontend

> Leer antes de tocar versiones de `pnpm`, `typescript` o `tsup` en `frontend/`.
> Última actualización: 2026-07-14.

## Resumen para un futuro agente

Se actualizó `pnpm` y las dependencias de `frontend/` a las versiones más recientes disponibles en ese momento. Todo quedó en `@latest` **excepto `typescript`**, que quedó fijo en `7.0.2` con un workaround de build porque la cadena `tsup → rollup-plugin-dts` todavía no soporta TypeScript 7. Este documento explica el problema, la solución aplicada, y qué revisar para poder eliminar el workaround en el futuro.

---

## 1. pnpm: bug en el self-update del instalador standalone

**Síntoma**: `pnpm self-update` fallaba con `Cannot use 'in' operator to search for 'integrity' in undefined`, sin importar si se limpiaba la store (`pnpm store prune`) o el lockfile interno.

**Causa**: la instalación de pnpm en esta máquina es la standalone oficial (`%LOCALAPPDATA%\pnpm\bin\`, instalada vía `get.pnpm.io/install.ps1`), no la instalada por `npm install -g`. Su mecanismo interno de auto-actualización (`pnpm self-update`) tenía un bug al reconstruir su propio grafo de dependencias internas.

**Solución aplicada**: reinstalar el binario corriendo de nuevo el instalador oficial (`Invoke-WebRequest https://get.pnpm.io/install.ps1 -UseBasicParsing | Invoke-Expression`), que reemplaza el binario directamente sin pasar por el self-update roto. Quedó en `pnpm 11.13.0`.

**Nota aparte (no relacionada con el bug, informativa)**: el `~/.npmrc` global del usuario tiene `min-release-age=86400000` (bloquea instalar vía `npm` paquetes publicados hace menos de 24h). Esto es intencional (seguridad de cadena de suministro) y no se debe quitar; solo tenerlo en cuenta si un `npm install -g <algo>@latest` falla con `ENOVERSIONS` en el futuro.

---

## 2. Dependencias de `frontend/` actualizadas

Se corrió `pnpm update -r` (respeta rangos semver del `package.json`) sobre las 3 packages del workspace (`suportum-chat`, `demo`, root). Quedaron en su última versión dentro del rango `^`: `@tailwindcss/postcss`, `@tailwindcss/vite`, `@vitejs/plugin-react`, `tailwindcss`, `lucide-react`, `vite`.

**Bloqueo encontrado durante el proceso**: `EACCES` al reescribir archivos de `node_modules/.pnpm`. Causa: procesos `node` de una sesión `pnpm dev` / `vite` anterior habían quedado corriendo en background y tenían archivos abiertos. Se resolvió matando esos procesos antes de reintentar. Si vuelve a pasar, revisar `Get-Process node` antes de asumir que es un problema de la dependencia.

---

## 3. TypeScript 6 → 7: incompatibilidad con `tsup` (el workaround activo)

### El problema

`packages/suportum-chat` es una librería publicable a npm. Necesita generar `.d.ts` al buildear (`pnpm build`). Antes, `tsup` generaba esos `.d.ts` usando `rollup-plugin-dts` (bundleaba todos los tipos en un solo `dist/index.d.ts`), vía la opción `dts: true` en `tsup.config.ts`.

Al actualizar `typescript` de `6.0.3` a `7.0.2`, el build fallaba con:

```
TypeError: Cannot read properties of undefined (reading 'useCaseSensitiveFileNames')
  at .../rollup-plugin-dts@6.1.1.../rollup-plugin-dts.cjs
```

**Causa raíz confirmada**: `rollup-plugin-dts@6.1.1` accede a estructuras internas (no-públicas) del compilador de TypeScript, y TypeScript 7 cambió esas estructuras. Además, esa versión de `rollup-plugin-dts` **viene compilada/inlineada dentro del propio `tsup@8.5.1`** (en `dist/rollup.js`), no es una dependencia que se pueda sobreescribir con un `pnpm override`: se probó forzar `rollup-plugin-dts@6.4.1` vía override y no tuvo ningún efecto porque no hay un `require()` real a un paquete instalable en runtime.

El `typecheck` (`tsc --noEmit`) nunca falló con TS7 porque usa la API pública del compilador, que sí es estable entre versiones. Solo la generación de `.d.ts` de `tsup` (vía `rollup-plugin-dts`) está rota.

### La solución aplicada

Se dejó de usar `tsup` para generar los `.d.ts` y se usa `tsc` directamente en un paso adicional del build:

- `packages/suportum-chat/tsup.config.ts` → `dts: false`
- `packages/suportum-chat/package.json` → script `"build": "tsup && tsc --emitDeclarationOnly"`

Esto sí funciona con TypeScript 7 porque `tsc --emitDeclarationOnly` no depende de `rollup-plugin-dts`.

**Efecto secundario (cosmético, no funcional)**: antes `dist/` tenía un solo `index.d.ts` bundleado (~1.37 KB). Ahora `tsc` emite un `.d.ts` por cada archivo fuente (~97 archivos, misma estructura que `src/`). Sigue funcionando igual para quien instale el paquete (`import`/`require` resuelven los tipos igual), solo cambia qué archivos ve alguien que abra `node_modules/suportum-chat/dist/`.

**Detalle verificado, preexistente, no introducido por este cambio**: `dist/index.d.ts` incluye textualmente `import './styles/tailwind.css';` porque `src/index.ts` tiene ese import de efecto (para que `tsup` con `injectStyle: true` inyecte el CSS en el JS). Ese archivo `.css` no existe en `dist/`. Se confirmó comparando: el `.d.ts` bundleado viejo (`rollup-plugin-dts` + TS 6.0.3) tenía exactamente la misma línea. Solo sería un error real para un consumidor con `skipLibCheck: false` en su `tsconfig` (no es el default en Vite/CRA/Next). No se tocó porque no es parte de este cambio y no es una regresión.

### Qué revisar en el futuro para eliminar este workaround

Antes de tocar esto, correr en `frontend/`:

```powershell
npm view tsup versions --json          # buscar release > 8.5.1
npm view rollup-plugin-dts versions --json   # buscar release > 6.1.1/6.4.1 que declare soporte TS7
```

Si `tsup` publica una versión que ya use un `rollup-plugin-dts` compatible con TypeScript 7 (probar con `pnpm add -D tsup@latest` y correr `pnpm build`):

1. Revertir `packages/suportum-chat/tsup.config.ts` → `dts: true`
2. Revertir `packages/suportum-chat/package.json` → `"build": "tsup"`
3. Confirmar que `pnpm build` genera `dist/index.d.ts` sin error y que el `import './styles/tailwind.css'` sigue siendo inofensivo (o, si se quiere, aprovechar la actualización para finalmente limpiar ese import del `.d.ts` con un postprocess).

---

## 4. Regla general para futuras actualizaciones de este proyecto

- Siempre instalar/actualizar paquetes con `@latest` (nunca fijar versiones a mano salvo que se documente aquí el motivo, como con `typescript`).
- Antes de aceptar un salto de versión mayor (major) en una dependencia core del build (`typescript`, `tsup`, `vite`, `tailwindcss`), correr `pnpm build` completo (no solo `pnpm typecheck`) en `suportum-chat`, porque el `typecheck` no detecta roturas en el pipeline de build/bundling.
- Si algo de esta sección 3 ya no aplica (porque el ecosistema se puso al día), **borrar esta sección y este archivo si no queda nada más pendiente**, no dejar contexto histórico muerto.
