# Bitácora de Entreno

App web instalable (PWA) para registrar día a día la rutina de gimnasio: ejercicios, series, pesos, reps y tiempos. Pensada para uso personal, sin backend ni cuentas — todos los datos quedan guardados en el propio celular (localStorage).

Versión publicada como Artifact de Claude (referencia / backup en vivo):
https://claude.ai/artifact/1daBM2muvPKgDjKithRubY

## Archivos

- `index.html` — toda la app: markup, estilos y lógica (vanilla JS, sin dependencias ni build step).
- `manifest.json` — manifest de la PWA (nombre, íconos, modo standalone).
- `sw.js` — service worker mínimo, cachea el shell de la app para que funcione offline.
- `icon-192.png` / `icon-512.png` — íconos generados localmente.
- `fonts.css` + `fonts/` — Oswald, Manrope e IBM Plex Mono auto-hospedadas (subset latin, 10 archivos woff2, ~214 KB).

No hay backend, no hay build (no hace falta `npm install` ni bundler). Es HTML/CSS/JS plano, y no
contacta ningún servidor externo: una vez servida, funciona entera sin red.

## Cómo correrla localmente

Cualquier servidor estático alcanza, por ejemplo:

```bash
cd bitacora-app
python3 -m http.server 8000
# abrir http://localhost:8000/index.html
```

Ojo: para que el service worker y el manifest se registren bien, tiene que servirse por http(s) (no funciona bien abriendo el `index.html` directo con `file://`).

## Cómo instalarla en Android

1. Subir los archivos a cualquier hosting estático (GitHub Pages, Vercel, Netlify, etc.) o dejarla corriendo en un servidor accesible desde el celular.
2. Abrir la URL en Chrome en Android.
3. Menú ⋮ → "Agregar a pantalla de inicio" (o el prompt nativo de instalación, si el navegador lo ofrece).

## Modo prueba

Agregar `?test` a la URL abre la app en modo prueba:

```
https://tomijerez.github.io/bitacora-entreno/?test
```

Sirve para simular el día a día sin ensuciar el historial real. Lo que hace:

- **Usa claves de `localStorage` propias** (mismos nombres con sufijo `_test`). Los datos reales no
  se leen ni se escriben mientras estés en modo prueba, así que no hay riesgo de mezclar nada.
- **Permite simular cualquier fecha**: hay un selector de día y botones `◀ día` / `día ▶`, así se
  puede recorrer la semana y ver cómo arma cada día la rutina. La fecha elegida se recuerda.
- **Siembra datos de ejemplo**: "Sembrar 2 semanas" crea 10 sesiones pasadas de lunes a viernes, con
  pesos y duraciones, para poder ver el Historial y las referencias de "Última vez".
- **Borra todo de un toque**: "Borrar datos de prueba" (con doble confirmación) elimina las claves
  `_test` y sale del modo prueba. Sale en vez de recargar a propósito: recargando dentro del modo,
  la app recrearía la plantilla por defecto y volvería a dejar claves de prueba.

La barra es deliberadamente llamativa para que no se confunda con la app real. Sin `?test` en la URL
nada de esto existe: `TEST_MODE` queda en `false` y las claves son las normales.

## Modelo de datos (localStorage)

- `bitacora_template_v1`: plantilla semanal editable (lunes a viernes), cada día con su lista de ejercicios (nombre, tipo, y series y reps objetivo si son de fuerza).
- `bitacora_sessions_v1`: sesiones registradas por fecha (`YYYY-MM-DD`). Cada sesión clona los ejercicios de la plantilla del día al crearse, pero es totalmente editable sin afectar la plantilla (agregar/quitar ejercicios, cambiar el enfoque del día, etc.).

Cada ejercicio tiene un `kind`:

- `strength`: apunta a `targetSets` × `targetReps` (4 × 8-12 por defecto) y se registra con **un solo peso** (`weight`, el máximo levantado en el ejercicio) y un `done`. No se anota serie por serie.
- `cardio`: no usa peso ni series. Ofrece un par de duraciones en `options` (10 y 15 min) y guarda la elegida en `minutes`, más el `done`.
- `bitacora_ui_v1`: preferencias de UI (tab activa, si se cerró el banner de instalación).

El archivo que genera "Exportar" tiene esta forma:

```json
{
  "app": "bitacora-entreno",
  "version": 1,
  "exportedAt": "2026-09-20T15:00:00.000Z",
  "template": { "mon": { "focus": "...", "exercises": [ ... ] }, ... },
  "sessions": { "2026-09-15": { ... } }
}
```

## Funcionalidad

- **Hoy**: arma el día según la plantilla semanal. Cada ejercicio es una tarjeta con el peso y un tilde; el placeholder del peso muestra el último registrado para ese ejercicio. Permite agregar un ejercicio suelto (fuerza o cardio) o copiar los ejercicios de otro día.
- **Reemplazar (✎)**: cambia el nombre del ejercicio **solo en esa sesión** — sirve para cuando la máquina está ocupada o la cambiaron. La plantilla no se toca, así que la semana siguiente vuelve el original. Enter confirma, Escape cancela, y un nombre vacío deja el anterior.
- **Checklist por ejercicio**: se marca el ejercicio entero, no serie por serie. El contador de arriba lleva el progreso (`2/4 ejercicios`).
- **Cardio**: las tarjetas de cardio no piden kg; se elige la duración en el momento entre las opciones disponibles (10 o 15 min). Volver a tocar la opción elegida la desmarca.
- **Terminar día**: un botón cierra el día y lo marca como terminado (queda visible en el Historial). Se puede reabrir si se cerró por error. No se mide cuánto duró el entreno.
- **Rutina**: edición de la plantilla semanal — nombre, tipo (fuerza/cardio), series y reps por ejercicio. Incluye botón "Restaurar plantilla por defecto" con doble confirmación.
- **Historial**: todas las sesiones pasadas, cada una abre en el mismo editor que "Hoy" (permite corregir datos cargados).
- **Copia de seguridad** (en la tab "Rutina"): exporta plantilla + sesiones a un `.json`, e importa desde
  un archivo previo. Importar reemplaza todo lo que haya, así que pide doble confirmación y muestra
  cuántas sesiones trae el archivo. Valida el contenido antes de pisar nada.

## Rutina por defecto (editable desde la app)

Todos los ejercicios de fuerza apuntan a **4 series de 8-12 reps**. "Cinta" es cardio (10 o 15 min).

- **Lunes** — Pecho / Tríceps: Pecho plano, Pecho aperturas, Tríceps con barra, Cinta
- **Martes** — Espalda / Bíceps: Jalón al pecho, Remo, Bíceps martillo, Bíceps supino
- **Miércoles** — Piernas: Cuádricep, Isquio, Ad/abductores o prensa, Cinta
- **Jueves** — Hombro / Tríceps: Press militar, Vuelos, Tríceps con cinta, Cinta
- **Viernes** — Pecho / Espalda / Hombro / Bíceps: Pecho inclinado, Jalón al pecho, Press militar, Bíceps supino

## Notas de diseño / decisiones tomadas

- Sin frameworks ni librerías externas (bundle mínimo, cero dependencias que puedan romperse).
- Los ejercicios que vienen de la rutina **no se pueden borrar desde "Hoy"**: solo se reemplazan. Un
  toque accidental en el gimnasio no debería costar una tarjeta, y borrar no tiene mucho sentido —
  la sesión es el registro de lo que hiciste. Los que agregás vos ese día (a mano o copiados de otro
  día) llevan `custom: true` y sí muestran la ✕, porque si no, un agregado por error quedaría pegado
  sin forma de sacarlo. Para cambiar la rutina de verdad está la tab Rutina, donde la ✕ sí es
  permanente.
- El registro es deliberadamente grueso: el peso máximo y un tilde por ejercicio, en vez de kg y reps
  por serie. La versión anterior pedía cuatro filas por ejercicio y en la práctica era mucho tipeo en
  el gimnasio. No hay timer de descanso por la misma razón.
- Tampoco se cronometra el entreno. Había un inicio/fin con reloj en vivo y duración guardada; se sacó
  porque el dato no se usaba. Queda sólo `finishedAt` como marca de que el día se cerró — el valor es
  un timestamp, pero se lee como booleano.
- Hay migración automática del formato viejo (`sets: [{weight, reps, done}]`): al cargar, cada
  ejercicio se colapsa al último peso anotado y queda `done` si todas sus series lo estaban. Corre
  tanto sobre `localStorage` como al importar un archivo `version: 1`, y se persiste una sola vez.
- Sin backend: todo vive en `localStorage` del navegador que lo abre. Como esa es la única copia,
  hay export/import a JSON — conviene exportar cada tanto, porque borrar los datos del sitio o
  desinstalar la PWA se lleva el historial puesto.
- Las tipografías se sirven desde `fonts/` en vez de Google Fonts. Cargarlas desde la red significaba
  que el service worker no las podía cachear (respuesta opaca, `status 0`), así que sin señal caían
  siempre a fallback; de paso, evita pingear a Google en cada carga.
- Hay dos `<meta name="theme-color">`, uno por esquema, porque el CSS respeta `prefers-color-scheme`.
  El `manifest.json` admite un solo color y quedó en el claro (`#F4F5F8`), que es el del `:root`: en un
  celu en modo oscuro el splash se ve claro un instante antes de que abra la app. Para invertirlo,
  cambiar `theme_color` y `background_color` a `#0E1116`.
- Varias cosas que el host de Claude Artifacts daba gratis hay que declararlas a mano corriendo fuera
  de ese entorno: `[hidden]{display:none !important}` en el CSS, y el `<meta name="viewport">` en el
  `<head>` — sin este último Chrome Android renderiza a 980px y la app queda miniaturizada.
- El service worker precachea el shell completo (`index.html`, `manifest.json`, `fonts.css`, las 10 woff2
  y los íconos). El shell crítico va con `addAll` — si falla, el SW no se instala — y fuentes e íconos
  se cachean best-effort, para que un archivo que falte no aborte la instalación entera.
- Si se edita `index.html` y se vuelve a desplegar, puede hacer falta forzar refresh: el `CACHE_NAME`
  en `sw.js` está versionado (hoy `bitacora-v7`) y subir ese número invalida el cache viejo.
