# Changelog

## [0.3.0] - 2026-09-27

> Nota: el changelog no tenia entradas entre 0.1.0 y 0.1.7 (varios publishes
> sin registro, package.json se bumpea en cada publish a npm y no siempre hay
> un cambio grande detras de cada patch). Se retoma el registro desde aca.
> La 0.2.0 se salteo por un doble bump accidental antes de este publish, no
> existe como version publicada.

- Project branding: logo del proyecto opcional en el Setup Wizard (paso 1) y
  editable despues en AdminSettings. PNG/JPG/GIF/WebP, maximo 2MB, redimensionado
  automatico a 512px, convertido a WebP.
- Validacion de API Key + dominio: el widget consulta el backend antes de decidir
  que pantalla mostrar. Si la API Key no existe en el servidor, muestra una
  pantalla informativa en vez de asumir que hay que crear un proyecto nuevo. Si la
  API Key es de otro dominio al que fue registrada, bloquea con una pantalla de
  error, nunca intenta el login.
- `locale` ahora acepta `'auto'` (o se puede omitir el prop): detecta el idioma
  del navegador del visitante (ingles/espanol), y recuerda en `localStorage`
  cualquier cambio manual de idioma hecho desde el toggle del propio widget.

## [0.1.0] - 2026-06-09

Initial release.

- Chat en tiempo real via Socket.IO (namespaces por proyecto)
- Tickets: creacion, asignacion, estados, prioridad
- Ordenes: kanban 5 columnas con expand/collapse fullscreen
- Gestion de usuarios con roles (admin)
- Temas: dark-dragon y light-clean con preview en vivo
- Role-based UI: client / agent / admin desde el mismo componente
- i18n: ingles y espanol
- iOS Safari: anti-zoom en inputs, 100dvh fallback, scroll inercial
- Widget animado con soporte de swipe-down en mobile
