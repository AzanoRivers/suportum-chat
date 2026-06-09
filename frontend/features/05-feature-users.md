# 05 — User Management Frontend

## 1. Objetivo
Panel de gestión de usuarios para el admin: listar, crear, editar rol, desactivar.
Agents ven su propio perfil. Clients ven su propio perfil básico.

## 2. Componentes a Implementar

### Molecules
- `UserRow` — fila de usuario: avatar, username, email, rol badge, estado, acciones
- `RoleBadge` — badge con colores: client (gris), agent (cian), admin (dorado)
- `UserActions` — botones de acción por fila: editar, desactivar

### Organisms
- `AdminUsers` — tabla/lista de usuarios con filtros
- `UserDetail` — panel lateral de detalle del usuario
- `UserCreateForm` — modal para crear usuario (admin)
- `UserEditForm` — modal para editar rol/estado (admin)
- `ProfilePanel` — vista del propio perfil (todos los roles)

### Templates
- Integrar `AdminUsers` en `AdminView`
- Integrar `ProfilePanel` como sección en `ClientView`, `AgentView`, `AdminView`

## 3. Store

### `store/userStore.ts`
```ts
interface UserState {
  users: User[]
  isLoading: boolean
  fetchUsers: () => Promise<void>
  addUser: (user: User) => void
  updateUser: (user: User) => void
}
```

## 4. UI/UX — Admin Users

### Lista Desktop
```
┌────────────────────────────────────────────────┐
│ Usuarios del Proyecto              [+ Invitar] │
├────────────────────────────────────────────────┤
│ [client] [agent] [admin]    Buscar: [_______]  │  ← filtros
├────────────────────────────────────────────────┤
│ [Av] andres         andres@email.com  [CLIENT] │  ✓ activo  [···]
│ [Ca] carlos_agent   carlos@email.com  [AGENT]  │  ✓ activo  [···]
│ [Ad] admin          admin@email.com   [ADMIN]  │  ✓ activo  [···]
│ [Us] user_inactivo  user@email.com    [CLIENT] │  ✗ inactivo [···]
└────────────────────────────────────────────────┘
```

### RoleBadge Colores
| Rol | Color |
|---|---|
| `client` | `text-text-secondary border-border-default` |
| `agent` | `text-accent border-accent/30` |
| `admin` | `text-status-pending border-status-pending/30` |

## 5. UserCreateForm

Campos:
- Email (requerido, validación de formato)
- Username (requerido, 3-30 chars)
- Password temporal (requerido, min 8 chars)
- Rol (select: client/agent/admin)

Validación client-side + manejo de errores `EMAIL_TAKEN` y `USERNAME_TAKEN` del backend.

## 6. ProfilePanel — Todos los Roles

```
┌────────────────────────────┐
│ Mi Perfil                  │
├────────────────────────────┤
│ [Av]  andres               │
│       andres@email.com     │
│       [CLIENT]             │
├────────────────────────────┤
│ Cambiar username:          │
│ [___________________]      │
│                            │
│ Cambiar contraseña:        │
│ [___________________]      │
│ [Nueva contraseña]         │
│ [Confirmar contraseña]     │
│                            │
│ [  Guardar cambios  ]      │
└────────────────────────────┘
```

## 7. Hooks

### `hooks/useUsers.ts`
```ts
export function useUsers(apiUrl: string) {
  // Carga lista de usuarios (admin)
  // Retorna { users, isLoading, createUser, updateUser, deactivateUser }
}
```

## 8. Mobile — Lista de Usuarios

En mobile, la lista de usuarios es una lista de tarjetas (no tabla):
```
┌──────────────────────────────┐
│ [Av] andres                  │
│      andres@email.com [CLIENT]│
│      ✓ activo            [→] │
└──────────────────────────────┘
```
Touch target mínimo: `min-h-14` por item.

## 9. Seguridad Frontend

- [ ] Solo el admin ve los botones de crear/editar/desactivar usuarios
- [ ] Un user no puede elevarse a sí mismo — el select de rol no existe en el ProfilePanel
- [ ] `PATCH /users/{id}` solo se llama desde `UserEditForm` (admin) o `ProfilePanel` (propio perfil)
- [ ] Password en `ProfilePanel`: confirmación de contraseña coincide antes de enviar

## 10. Desarrollo — Pasos

1. Implementar `store/userStore.ts`
2. Implementar `hooks/useUsers.ts`
3. Implementar molecules: `UserRow`, `RoleBadge`, `UserActions`
4. Implementar organisms: `AdminUsers`, `UserDetail`, `UserCreateForm`, `UserEditForm`, `ProfilePanel`
5. Integrar en las vistas correspondientes
6. Probar: admin crea agent → agent se puede loguear → admin desactiva → agent no puede loguear

## 11. Auditoría

### 11.1 Checklist de Seguridad
- [ ] Botones de admin no visibles para agent/client (aunque el backend los rechazaría)
- [ ] Password nunca aparece en el store ni en logs

### 11.2 Checklist iOS Safari
- [ ] Rows: `min-h-14`
- [ ] Form inputs: `text-base`
- [ ] Modal/panel: scroll con `-webkit-overflow-scrolling: touch`

### 11.3 Checklist de Funcionalidad
- [ ] Crear usuario: errores `EMAIL_TAKEN`/`USERNAME_TAKEN` visibles en el form
- [ ] Desactivar usuario: row muestra `✗ inactivo` sin recargar
- [ ] Filtros de rol funcionan

## 12. Criterios de Aprobación (Done)
- [ ] Admin puede CRUD usuarios completo
- [ ] Usuario desactivado se refleja en la lista sin recargar
- [ ] ProfilePanel funciona para todos los roles (cambiar username/password)
- [ ] Roles visibles en la lista con colores correctos
- [ ] Reviewer confirma APPROVED
