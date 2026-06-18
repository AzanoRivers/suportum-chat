# SpaceX Dragon OS Design System (Research + Reverse Engineering)

## Objetivo

Replicar con alta fidelidad la filosofía visual, UX, arquitectura de información y lenguaje de interfaz observado en SpaceX Crew Dragon para aplicaciones web, dashboards, sistemas operativos web, centros de control, plataformas IoT, SCADA modernos y software de misión crítica.

---

# Principios Fundamentales

## 1. Information First

La interfaz no busca verse futurista.

La interfaz busca:

- Mostrar estado del sistema.
- Reducir errores humanos.
- Permitir decisiones rápidas.
- Minimizar carga cognitiva.

Regla:

> Si un elemento no aporta información o acción, no existe.

---

## 2. Minimalismo Operacional

SpaceX eliminó cientos de botones físicos reemplazándolos por pantallas táctiles organizadas por contexto operacional.

Características:

- Muy pocos colores.
- Muy pocos iconos.
- Tipografía dominante.
- Mucho espacio negativo.
- Agrupación lógica de información.

---

## 3. Automation First

La interfaz asume que el sistema opera automáticamente.

El usuario:

- Supervisa.
- Autoriza.
- Interviene únicamente cuando es necesario.

La UI comunica estado.

No solicita interacción constante.

---

## 4. Jerarquía Militar/Aeroespacial

Cada pantalla posee:

### Nivel 1

Estado crítico.

### Nivel 2

Telemetría.

### Nivel 3

Configuración.

### Nivel 4

Diagnóstico.

Nunca se mezclan.

---

# Identidad Visual

## Paleta Principal

### Fondo

```css
#030B3A
#04104B
#07185D
```

### Paneles

```css
#0A1E72
#112884
```

### Bordes

```css
rgba(255,255,255,.15)
```

### Texto

```css
#FFFFFF
rgba(255,255,255,.7)
rgba(255,255,255,.45)
```

### Estados

Success

```css
#00F5B0
```

Warning

```css
#FFC857
```

Danger

```css
#FF5A7A
```

Info

```css
#4FC3FF
```

---

# Sistema de Tipografía

## Primaria

Inter

Alternativas:

- IBM Plex Sans
- SF Pro Display
- Roboto Flex

## Escala

```txt
64 Mission Value
48 Primary Metric
32 Secondary Metric
24 Section
18 Label
14 Body
12 Caption
```

Regla:

Los números son más grandes que el texto.

Siempre.

---

# Arquitectura Visual

## Layout Base

```txt
┌───────────────────────────────┐
│ TOP STATUS BAR                │
├──────────────┬────────────────┤
│ NAVIGATION   │ MAIN VIEW      │
│              │                │
│              │                │
├──────────────┴────────────────┤
│ SYSTEM STATUS                 │
└───────────────────────────────┘
```

---

# Componentes Core

## Mission Panel

Contenedor principal.

Características:

- Bordes redondeados.
- Contorno fino.
- Sin sombras pesadas.
- Fondo translúcido.

---

## Telemetry Card

Muestra:

- velocidad
- temperatura
- energía
- presión
- posición

Formato:

```txt
VALUE
LABEL
```

Ejemplo:

7.69 km/s
Velocity

---

## Orbital View

Elemento central.

Características:

- Gran tamaño.
- Mucho espacio alrededor.
- Información secundaria periférica.

Nunca saturar el centro.

---

## Radial Systems

Como se observa en Dragon.

Representan:

- Energía
- Propulsión
- Comunicación
- Navegación
- Sensores

Usar:

- círculos
- anillos
- sectores
- líneas finas

---

## Command Buttons

Estados:

Idle
Armed
Executing
Completed
Failed

Visual:

```css
border: 1px solid rgba(255,255,255,.2);
background: transparent;
```

Hover:

```css
background: rgba(255,255,255,.08);
```

---

# Sistema de Grid

## Desktop

12 columnas

```txt
80px gutter externo
24px separación
```

## Pantallas Operativas

```txt
Left Panel    20%
Main Area     60%
Right Panel   20%
```

---

# Estilo de Bordes

Característica muy visible en Dragon.

```css
border-radius: 18px;
```

Bordes:

```css
1px solid rgba(255,255,255,.15)
```

Líneas internas:

```css
rgba(255,255,255,.08)
```

---

# Efectos Visuales

## Glow

Muy suave.

```css
box-shadow:
0 0 10px rgba(120,180,255,.15);
```

Nunca estilo gaming.

Nunca neon agresivo.

---

## Blur

```css
backdrop-filter: blur(12px);
```

Solo para paneles.

---

# Sistema de Iconografía

Inspiración:

- Aeroespacial
- Militar
- Industrial
- NASA
- SpaceX

Características:

- Monoline
- Stroke uniforme
- Sin rellenos

Stroke:

```css
1.5px
```

---

# Motion Design

Duración:

```txt
150ms
200ms
300ms
```

Curva:

```css
ease-out
```

Animaciones permitidas:

- fade
- scale suave
- data update
- panel reveal

No:

- rebotes
- efectos flashy
- partículas

---

# UX Rules

## Regla 1

Una pantalla = una tarea.

---

## Regla 2

Datos críticos arriba.

---

## Regla 3

Acciones peligrosas requieren confirmación.

---

## Regla 4

Todo estado debe ser visible.

---

## Regla 5

La información cambia.
La estructura nunca.

---

# Adaptación Web Moderna

Stack recomendado

- Astro
- React
- TypeScript
- Tailwind v4
- Motion One

---

# Tailwind Tokens

```css
--dragon-bg: #030B3A;
--dragon-panel: #0A1E72;
--dragon-border: rgba(255,255,255,.15);
--dragon-text: #FFFFFF;
--dragon-info: #4FC3FF;
--dragon-success: #00F5B0;
--dragon-warning: #FFC857;
--dragon-danger: #FF5A7A;
```

---

# Conclusión

El secreto del diseño Dragon no es el futurismo.

Es:

- simplicidad extrema
- jerarquía rigurosa
- automatización
- telemetría clara
- mínima carga cognitiva
- precisión operacional

Si una web adopta estas reglas, el resultado se percibe inmediatamente como un sistema operativo aeroespacial inspirado en SpaceX Crew Dragon.
