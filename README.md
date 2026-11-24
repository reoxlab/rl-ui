# rl-ui

Selector de tema claro / oscuro / sistema compartido por las herramientas web
de Reox Lab (TableRL, PlotRL, DifRL y las que vengan). Antes este código vivía
copiado en cada herramienta (~50 líneas repetidas en cada `src/theme.ts`);
ahora vive aquí, en un solo lugar, y se arregla una vez para todas.

- **Modos:** claro, oscuro y sistema (sigue a `prefers-color-scheme`).
- **En caliente:** si la elección es «sistema» y el sistema cambia de tema,
  la página reacciona sola.
- **Persistencia:** la elección se guarda en `localStorage` bajo la clave de
  cada herramienta, así cada una conserva SU clave y SU comportamiento.
- **CSS:** el tema efectivo se escribe en
  `document.documentElement.dataset.theme`; el CSS lo lee con
  `[data-theme="dark"]`.
- **Sin dependencias** en tiempo de ejecución. Solo TypeScript.
- **Licencia:** GPL v3 (todo derivado sigue libre).

## Instalación

```sh
npm install git+https://git.reoxlab.com/fpena/rl-ui.git
```

## Uso rápido

Una sola llamada cablea todo lo que antes se repetía en cada `main.ts`
(carga, select, `matchMedia`, escritura del tema efectivo):

```ts
import { createThemeController } from 'rl-ui'

const theme = createThemeController({
  // Clave propia de TU herramienta: consérvala, no la compartas con otra.
  storageKey: 'difrl-theme-v1',
  select: document.querySelector<HTMLSelectElement>('#theme-select'),
  // Opcional: repintar lo que dependa del tema (gráficas Canvas, etc.).
  onThemeChange: () => render(),
})

// Después puedes leer o cambiar el tema desde cualquier parte:
theme.getChoice() // 'light' | 'dark' | 'system'
theme.getTheme() // 'light' | 'dark' (el efectivo)
theme.setChoice('dark')
```

El `select` es opcional: sin él, el controlador solo aplica el tema guardado
(o «sistema») y reacciona a `prefers-color-scheme`. `dispose()` quita los
listeners del select y de `matchMedia`.

Claves que ya usan las herramientas (no las cambies, o la preferencia guardada
de cada usuario se reiniciaría a «sistema» una vez):

| Herramienta | Clave |
| --- | --- |
| TableRL | `tablerl-theme-v1` |
| PlotRL | `plotrl-theme-v1` |
| DifRL | `difrl-theme-v1` |

## Funciones puras

La misma superficie que usaban TableRL y PlotRL, con la clave de
almacenamiento como parámetro, para quien prefiera cablear a mano:

```ts
import {
  loadThemeChoice,
  resolveTheme,
  saveThemeChoice,
  type StorageLike,
  type Theme,
  type ThemeChoice,
} from 'rl-ui'

const KEY = 'mi-herramienta-theme-v1'
let choice: ThemeChoice = loadThemeChoice(window.localStorage, KEY)
document.documentElement.dataset.theme = resolveTheme(
  choice,
  window.matchMedia('(prefers-color-scheme: dark)').matches,
)
saveThemeChoice(window.localStorage, 'dark', KEY)
```

| Exportación | Qué hace |
| --- | --- |
| `resolveTheme(choice, prefersDark)` | Tema efectivo (`light` / `dark`) |
| `loadThemeChoice(storage, storageKey)` | Lee la elección; `system` si no hay o es inválida |
| `saveThemeChoice(storage, choice, storageKey)` | Guarda la elección |
| `clearThemeChoice(storage, storageKey)` | Borra la elección guardada |
| `isThemeChoice(value)` | Guarda de tipo para `light` / `dark` / `system` |
| `createThemeController(options)` | Controlador cableado (ver arriba) |
| `ThemeChoice`, `Theme`, `StorageLike` | Tipos |
| `ThemeController`, `ThemeControllerOptions` | Tipos del controlador |

`StorageLike` es solo `{ getItem, setItem, removeItem }`, así que
`window.localStorage` sirve tal cual, y en pruebas se puede pasar un
almacenamiento en memoria.

## CSS

```css
/* Variables de claro por defecto; oscuro bajo [data-theme='dark']. */
[data-theme='dark'] {
  --fondo: #131315;
  --texto: #f5f5f5;
}
```

## Desarrollo

```sh
npm install
npm run build # tsc → dist/ (ESM + declaraciones .d.ts)
npm test # pruebas con esbuild + node
```

## Licencia

GPL v3. Ver `LICENSE`.
