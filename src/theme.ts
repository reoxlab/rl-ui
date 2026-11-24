// Copyright (C) 2026 Francisco Peña Gallardo (Reox Lab)
//
// This file is part of rl-ui.
//
// rl-ui is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// rl-ui is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with rl-ui. If not, see <https://www.gnu.org/licenses/>.

// rl-ui — temas claro / oscuro / sistema.
//
// Selector de tema compartido por las herramientas web de Reox Lab
// (TableRL, PlotRL, DifRL y las que vengan). Antes vivía copiado en cada
// herramienta (~50 líneas repetidas en cada `src/theme.ts`); ahora vive
// aquí, en un solo lugar, y se arregla una vez para todas.
//
// La elección del usuario se guarda en localStorage bajo la clave que pasa
// cada herramienta (por ejemplo `plotrl-theme-v1`), así cada una conserva
// SU clave y SU comportamiento. Por defecto la elección es «system», que
// sigue a `prefers-color-scheme` del sistema operativo y reacciona a
// cambios en caliente. El tema efectivo se escribe en
// `document.documentElement.dataset.theme` y el CSS lo lee con
// `[data-theme="dark"]`.
//
// Dos niveles de uso:
// - Funciones puras (`resolveTheme`, `loadThemeChoice`, `saveThemeChoice`):
//   la misma superficie que usaban TableRL y PlotRL, con la clave de
//   almacenamiento como parámetro.
// - `createThemeController`: cablea todo el bloque que antes se repetía en
//   cada `main.ts` (carga, select, `matchMedia`, escritura del tema
//   efectivo) con una sola llamada.

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type ThemeChoice = 'light' | 'dark' | 'system'
export type Theme = 'light' | 'dark'

export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): Theme {
  if (choice === 'dark') return 'dark'
  if (choice === 'light') return 'light'
  return prefersDark ? 'dark' : 'light'
}

export function isThemeChoice(value: string | null): value is ThemeChoice {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function loadThemeChoice(storage: StorageLike, storageKey: string): ThemeChoice {
  const raw = storage.getItem(storageKey)
  if (isThemeChoice(raw)) return raw
  return 'system'
}

export function saveThemeChoice(
  storage: StorageLike,
  choice: ThemeChoice,
  storageKey: string,
): void {
  storage.setItem(storageKey, choice)
}

export function clearThemeChoice(storage: StorageLike, storageKey: string): void {
  storage.removeItem(storageKey)
}

export interface ThemeControllerOptions {
  /** Clave de localStorage propia de la herramienta, p. ej. `difrl-theme-v1`. */
  storageKey: string
  /** Almacenamiento; por defecto `window.localStorage`. */
  storage?: StorageLike
  /** Select `<select>` con las opciones light / dark / system; opcional. */
  select?: HTMLSelectElement | null
  /** Se llama cada vez que cambia el tema efectivo (también al iniciar). */
  onThemeChange?: (theme: Theme, choice: ThemeChoice) => void
}

export interface ThemeController {
  /** Elección guardada del usuario (`light`, `dark` o `system`). */
  getChoice(): ThemeChoice
  /** Tema efectivo (`light` o `dark`) según la elección y el sistema. */
  getTheme(): Theme
  /** Guarda la elección, la aplica y sincroniza el select. */
  setChoice(choice: ThemeChoice): void
  /** Reaplica el tema efectivo (p. ej. tras cambiar el CSS). */
  apply(): void
  /** Quita los listeners del select y de `matchMedia`. */
  dispose(): void
}

export function createThemeController(options: ThemeControllerOptions): ThemeController {
  const storage = options.storage ?? defaultStorage()
  const select = options.select ?? null
  let choice = loadThemeChoice(storage, options.storageKey)
  const mediaQuery = defaultMediaQuery()

  function prefersDark(): boolean {
    return mediaQuery ? mediaQuery.matches : false
  }

  function apply(): void {
    const theme = resolveTheme(choice, prefersDark())
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme
    }
    if (select) select.value = choice
    options.onThemeChange?.(theme, choice)
  }

  function setChoice(next: ThemeChoice): void {
    if (!isThemeChoice(next)) return
    choice = next
    saveThemeChoice(storage, choice, options.storageKey)
    apply()
  }

  function onSelectChange(): void {
    if (!select) return
    setChoice(select.value as ThemeChoice)
  }

  function onMediaChange(): void {
    if (choice === 'system') apply()
  }

  if (select) select.addEventListener('change', onSelectChange)
  if (mediaQuery) mediaQuery.addEventListener('change', onMediaChange)
  apply()

  return {
    getChoice: () => choice,
    getTheme: () => resolveTheme(choice, prefersDark()),
    setChoice,
    apply,
    dispose: () => {
      if (select) select.removeEventListener('change', onSelectChange)
      if (mediaQuery) mediaQuery.removeEventListener('change', onMediaChange)
    },
  }
}

function defaultStorage(): StorageLike {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
  throw new Error('rl-ui: no hay window.localStorage; pasa `storage` en las opciones')
}

function defaultMediaQuery(): MediaQueryList | null {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)')
  }
  return null
}
