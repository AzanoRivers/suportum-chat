# Suportum

**English** | [Español](#español)

---

## English

Suportum is an open-source real-time support and order management platform designed to be embedded in any web application. Built with a multi-project backend, it can serve multiple independent clients simultaneously from a single deployment.

### Use Cases

- **Gaming**: in-game support panels, order boards for virtual items, player-to-staff communication
- **Healthcare**: patient intake coordination, appointment request queues, real-time clinic alerts
- **Customer support**: live chat widget, ticket management, agent dashboards

### Architecture

The system is composed of two independent packages:

- **Backend** (`backend/`): REST API and WebSocket server built with FastAPI and Socket.IO. Each tenant (project) is isolated by a unique API key and a scoped database partition.
- **Frontend** (`suportum-chat`): Publishable npm package providing a self-contained React widget. Role-based UI adapts automatically to `client`, `agent`, and `admin` roles.

### Key Features

- Multi-project isolation: one backend process, multiple independent projects
- Real-time messaging via Socket.IO namespaces
- Ticket management with state machine (open, in progress, resolved, closed)
- Order board with Kanban-style workflow
- Role-based access control with JWT authentication
- Embeddable widget with theme support (dark, light)
- Bilingual interface: English and Spanish

### Getting Started

See `backend/README.md` for server setup and `frontend/README.md` for widget integration.

---

## Español

Suportum es una plataforma de código abierto para soporte en tiempo real y gestión de órdenes, diseñada para integrarse en cualquier aplicación web. Con un backend multi-proyecto, permite atender múltiples clientes independientes desde un único despliegue.

### Casos de uso

- **Gaming**: paneles de soporte en juego, tableros de órdenes para ítems virtuales, comunicación jugador-staff
- **Salud**: coordinación de ingreso de pacientes, colas de solicitudes de citas, alertas de clínica en tiempo real
- **Atención al cliente**: widget de chat en vivo, gestión de tickets, dashboards para agentes

### Arquitectura

El sistema está compuesto por dos paquetes independientes:

- **Backend** (`backend/`): servidor REST y WebSocket construido con FastAPI y Socket.IO. Cada proyecto (tenant) queda aislado por una clave de API única y una partición de base de datos acotada.
- **Frontend** (`suportum-chat`): paquete npm publicable que provee un widget React autocontenido. La UI basada en roles se adapta automáticamente a `client`, `agent` y `admin`.

### Funcionalidades principales

- Aislamiento multi-proyecto: un proceso de backend, múltiples proyectos independientes
- Mensajería en tiempo real via namespaces de Socket.IO
- Gestión de tickets con máquina de estados (abierto, en progreso, resuelto, cerrado)
- Tablero de órdenes con flujo estilo Kanban
- Control de acceso basado en roles con autenticación JWT
- Widget embebible con soporte de temas (oscuro, claro)
- Interfaz bilingue: inglés y español

### Mantener el widget actualizado

El widget recibe actualizaciones frecuentes con correcciones y mejoras. Para obtener la ultima version en tu proyecto:

```bash
npm update suportum-chat
# o: pnpm update suportum-chat
# o: yarn upgrade suportum-chat
```

No se requieren cambios en tu codigo después de actualizar. Los estilos y la logica siempre vienen empaquetados juntos.

### Primeros pasos

Ver `backend/README.md` para configurar el servidor y `frontend/README.md` para la integración del widget.
