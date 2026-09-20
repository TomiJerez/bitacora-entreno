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

## Modelo de datos (localStorage)

- `bitacora_template_v1`: plantilla semanal editable (lunes a viernes), cada día con su lista de ejercicios (nombre, series objetivo, reps objetivo, descanso en segundos).
- `bitacora_sessions_v1`: sesiones registradas por fecha (`YYYY-MM-DD`). Cada sesión clona los ejercicios de la plantilla del día al crearse, pero es totalmente editable sin afectar la plantilla (agregar/quitar ejercicios, cambiar el enfoque del día, etc.).
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

- **Hoy**: arma el día según la plantilla semanal, con placeholders del último peso/reps registrado por ejercicio. Permite sacar ejercicios del día, agregar uno suelto, o copiar los ejercicios de otro día de la plantilla.
- **Timer de descanso**: al marcar una serie como hecha, dispara un countdown con el descanso configurado para ese ejercicio (vibración + beep al terminar).
- **Sesión con inicio/fin**: botón para registrar cuánto duró el entreno.
- **Rutina**: edición completa de la plantilla semanal (series, reps, descanso, agregar/quitar ejercicios por día). Incluye botón "Restaurar plantilla por defecto" con doble confirmación.
- **Historial**: todas las sesiones pasadas, cada una abre en el mismo editor que "Hoy" (permite corregir datos cargados).
- **Copia de seguridad** (en la tab "Rutina"): exporta plantilla + sesiones a un `.json`, e importa desde
  un archivo previo. Importar reemplaza todo lo que haya, así que pide doble confirmación y muestra
  cuántas sesiones trae el archivo. Valida el contenido antes de pisar nada.

## Rutina por defecto (editable desde la app)

- **Lunes** — Pecho / Tríceps: Pecho plano, Pecho aperturas, Tríceps con barra, Cinta
- **Martes** — Espalda / Bíceps: Jalón al pecho, Remo, Bíceps martillo, Bíceps supino
- **Miércoles** — Piernas: Cuádricep, Isquio, Ad/abductores o prensa, Cinta
- **Jueves** — Hombro / Tríceps: Press militar, Vuelos, Tríceps con cinta, Cinta
- **Viernes** — Pecho / Espalda / Hombro / Bíceps: Pecho inclinado, Jalón al pecho, Press militar, Bíceps supino

## Notas de diseño / decisiones tomadas

- Sin frameworks ni librerías externas (bundle mínimo, cero dependencias que puedan romperse).
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
  en `sw.js` está versionado (hoy `bitacora-v2`) y subir ese número invalida el cache viejo.
