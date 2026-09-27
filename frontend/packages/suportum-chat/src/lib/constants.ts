// Espeja los limites de backend/app/config.py (MAX_LOGO_SIZE_MB) y
// backend/app/core/upload.py (ALLOWED_MIMES). Si esos valores cambian en el
// backend, actualizar aca tambien para que la validacion client-side no quede
// desalineada. El backend siempre re-valida, esto es solo UX de feedback temprano.
export const MAX_LOGO_SIZE_MB = 2
export const MAX_LOGO_SIZE_BYTES = MAX_LOGO_SIZE_MB * 1024 * 1024

export const ALLOWED_LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const
