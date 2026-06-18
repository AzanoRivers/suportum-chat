# DragonOS UI/UX Reverse Engineering Guide v2.0

## Objetivo

Este documento NO es una guía de marca.

Es una especificación para replicar la experiencia visual, espacial y operativa observada en las pantallas de SpaceX Crew Dragon.

---

# Filosofía Principal

La mayoría de dashboards modernos están diseñados para usuarios.

Dragon está diseñado para operadores.

La diferencia es enorme.

## Dashboard SaaS

- Tarjetas
- Marketing visual
- Sombras
- Jerarquías comerciales

## Dragon

- Estado
- Telemetría
- Navegación
- Conciencia situacional
- Operación crítica

---

# Regla #1

## La interfaz es un instrumento

No una página web.

Piensa:

- Avión
- Nave espacial
- Radar
- Centro de control

Nunca:

- Ecommerce
- CRM
- Landing page
- Dashboard corporativo

---

# Anatomía Visual

## 70% Geometría

## 20% Datos

## 10% Decoración

La decoración prácticamente no existe.

---

# Sistema de Formas

## Forma Primaria

Círculo

```txt
○
◉
◎
◌
```

Todo debe derivar de:

- órbitas
- anillos
- radares
- targets
- trayectorias

---

## Forma Secundaria

Rectángulo redondeado

```css
border-radius: 18px;
border-radius: 24px;
```

Nunca esquinas agresivas.

---

## Forma Terciaria

Líneas técnicas

```txt
────────────
╱
╲
│
```

Conectan información.

---

# Diseño Radial

La primera pantalla muestra una regla fundamental:

## El centro gobierna todo

```txt
       TELEMETRY

    ○ MAIN OBJECT ○

SYSTEM         STATUS
```

La información secundaria orbita alrededor.

---

# Orbital Layout Pattern

```txt
      [Module]

[Module]  ○  [Module]

      [Module]
```

Usar para:

- sensores
- energía
- networking
- recursos
- navegación

---

# Paleta Dragon

## Fondo

```css
#020B2F
#031444
#061A58
#08206A
```

---

## Paneles

```css
#0A1E72
#0E267E
#17318E
```

---

## Bordes

```css
rgba(255,255,255,.12)
rgba(255,255,255,.18)
```

---

## Texto

```css
#FFFFFF
rgba(255,255,255,.75)
rgba(255,255,255,.45)
```

---

## Estados

Success

```css
#00F5B0
```

Info

```css
#48D6FF
```

Warning

```css
#FFC857
```

Danger

```css
#FF5A7A
```

---

# Proporción de Color

90% Azul

8% Blanco

2% Estados

Nunca más.

---

# Tipografía

## Primaria

Inter

## Alternativas

- IBM Plex Sans
- SF Pro
- Roboto Flex

---

# Jerarquía

Mission Value

```css
64px
```

Primary Metric

```css
48px
```

Telemetry

```css
32px
```

Labels

```css
14px
```

Captions

```css
12px
```

---

# Regla de Telemetría

Incorrecto

```txt
VELOCITY

7.69 km/s
```

Correcto

```txt
7.69 km/s

Velocity
```

El número siempre domina.

---

# Grid Dragon

## Desktop

12 columnas

```txt
80px margen exterior
24px gutter
```

---

## Cockpit Layout

```txt
20% navegación
60% misión
20% soporte
```

---

# Paneles

## Características

```css
background: rgba(255,255,255,.02);
border: 1px solid rgba(255,255,255,.12);
backdrop-filter: blur(12px);
```

---

# Sombras

Prácticamente inexistentes.

No usar:

```css
box-shadow: 0 20px 60px;
```

Usar:

```css
0 0 10px rgba(150,200,255,.10)
```

---

# Sistema de Líneas

Todas las líneas son finas.

```css
1px
```

o

```css
1.5px
```

Nunca más.

---

# Visual Density

La interfaz parece compleja.

Pero realmente utiliza:

- mucho espacio negativo
- pocas formas
- pocos colores

---

# Navegación

## No usar Sidebars SaaS

Evitar:

```txt
Dashboard
Analytics
Settings
Users
```

---

Usar:

```txt
Flight
Systems
Navigation
Comms
Mission
```

---

# Botones

Estado Idle

```css
transparent
```

Hover

```css
rgba(255,255,255,.05)
```

---

# Motion Design

150ms

200ms

300ms

Curva

```css
ease-out
```

---

# Animaciones Permitidas

- Fade
- State Transition
- Data Refresh
- Panel Reveal

---

# Animaciones Prohibidas

- Bounce
- Elastic
- Particle Effects
- Neon Pulsing

---

# Iconografía

Características

- Monoline
- Técnica
- Aeroespacial
- Industrial

Stroke

```css
1.5px
```

---

# Componentes DragonOS

## TelemetryCard

```txt
7.69 km/s

Velocity
```

---

## OrbitalMap

Centro dominante.

Nunca competir visualmente con otros módulos.

---

## RadialGauge

```txt
○
◎
◉
```

Para recursos y estados.

---

## MissionTimeline

```txt
Launch
Orbit
Dock
Transfer
Return
```

---

## SystemStatus

```txt
ONLINE
WARNING
OFFLINE
```

---

# Tailwind Tokens

```css
:root{

--dragon-bg:#020B2F;
--dragon-bg-2:#031444;

--dragon-panel:#0A1E72;
--dragon-panel-2:#17318E;

--dragon-border:rgba(255,255,255,.12);

--dragon-text:#FFFFFF;
--dragon-text-muted:rgba(255,255,255,.75);

--dragon-success:#00F5B0;
--dragon-info:#48D6FF;
--dragon-warning:#FFC857;
--dragon-danger:#FF5A7A;

}
```

---

# Qué Hace Que Algo Parezca Dragon

## Sí

- Círculos
- Anillos
- Telemetría
- Líneas técnicas
- Azul monocromático
- Mucho espacio negativo
- Datos grandes

## No

- Cards SaaS
- Gradientes llamativos
- Neomorphism
- Glassmorphism exagerado
- Sombras pesadas
- Colores saturados

---

# Test Final

Si alguien ve la interfaz durante 2 segundos y piensa:

"parece una consola de una nave espacial"

entonces el diseño está cerca de Dragon.

Si piensa:

"parece un dashboard empresarial"

hay que rediseñarlo.
