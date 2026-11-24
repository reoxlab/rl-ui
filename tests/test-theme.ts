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

// Pruebas del selector de tema. Sin framework: node:assert.
// Se ejecuta con esbuild + node (ver `npm test`).

import assert from 'node:assert/strict'
import {
  clearThemeChoice,
  createThemeController,
  isThemeChoice,
  loadThemeChoice,
  resolveTheme,
  saveThemeChoice,
  type StorageLike,
  type Theme,
  type ThemeChoice,
} from '../src/index.js'

class MemoryStorage implements StorageLike {
  private map = new Map<string, string>()
  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
}

// -- Funciones puras ---------------------------------------------------------

assert.equal(resolveTheme('dark', false), 'dark')
assert.equal(resolveTheme('dark', true), 'dark')
assert.equal(resolveTheme('light', true), 'light')
assert.equal(resolveTheme('light', false), 'light')
assert.equal(resolveTheme('system', true), 'dark')
assert.equal(resolveTheme('system', false), 'light')

assert.equal(isThemeChoice('light'), true)
assert.equal(isThemeChoice('dark'), true)
assert.equal(isThemeChoice('system'), true)
assert.equal(isThemeChoice('sepia'), false)
assert.equal(isThemeChoice(null), false)

const storage = new MemoryStorage()
const KEY = 'prueba-theme-v1'

// Sin nada guardado, la elección es «system».
assert.equal(loadThemeChoice(storage, KEY), 'system')

saveThemeChoice(storage, 'dark', KEY)
assert.equal(loadThemeChoice(storage, KEY), 'dark')
assert.equal(storage.getItem(KEY), 'dark')

// Un valor guardado inválido se trata como «system», sin romper nada.
storage.setItem(KEY, 'sepia')
assert.equal(loadThemeChoice(storage, KEY), 'system')

clearThemeChoice(storage, KEY)
assert.equal(storage.getItem(KEY), null)
assert.equal(loadThemeChoice(storage, KEY), 'system')

// Dos herramientas con claves distintas no se pisan.
saveThemeChoice(storage, 'dark', 'herramienta-a-theme-v1')
saveThemeChoice(storage, 'light', 'herramienta-b-theme-v1')
assert.equal(loadThemeChoice(storage, 'herramienta-a-theme-v1'), 'dark')
assert.equal(loadThemeChoice(storage, 'herramienta-b-theme-v1'), 'light')

// -- Controlador (con stubs mínimos de document y window) -------------------

const dataset: Record<string, string> = {}
const mediaListeners: Array<() => void> = []
const mediaQueryStub = {
  matches: false,
  addEventListener: (_type: string, fn: () => void) => {
    mediaListeners.push(fn)
  },
  removeEventListener: (_type: string, fn: () => void) => {
    const i = mediaListeners.indexOf(fn)
    if (i >= 0) mediaListeners.splice(i, 1)
  },
}
const selectListeners: Array<() => void> = []
const selectStub = {
  value: 'system',
  addEventListener: (_type: string, fn: () => void) => {
    selectListeners.push(fn)
  },
  removeEventListener: (_type: string, fn: () => void) => {
    const i = selectListeners.indexOf(fn)
    if (i >= 0) selectListeners.splice(i, 1)
  },
} as unknown as HTMLSelectElement

;(globalThis as unknown as { document: unknown }).document = {
  documentElement: { dataset },
}
const windowStorage = new MemoryStorage()
;(globalThis as unknown as { window: unknown }).window = {
  localStorage: windowStorage,
  matchMedia: () => mediaQueryStub,
}

const seen: Array<{ theme: Theme; choice: ThemeChoice }> = []
const controller = createThemeController({
  storageKey: 'difrl-theme-v1',
  select: selectStub,
  onThemeChange: (theme, choice) => {
    seen.push({ theme, choice })
  },
})

// Al iniciar, sin nada guardado: «system» y tema efectivo claro.
assert.equal(controller.getChoice(), 'system')
assert.equal(controller.getTheme(), 'light')
assert.equal(dataset['theme'], 'light')
assert.equal(selectStub.value, 'system')

// Cambiar a oscuro persiste, aplica y sincroniza el select.
controller.setChoice('dark')
assert.equal(controller.getChoice(), 'dark')
assert.equal(controller.getTheme(), 'dark')
assert.equal(dataset['theme'], 'dark')
assert.equal(selectStub.value, 'dark')
assert.equal(
  windowStorage.getItem('difrl-theme-v1'),
  'dark',
)

// Volver a «system» con el sistema en oscuro: el tema efectivo es oscuro.
mediaQueryStub.matches = true
controller.setChoice('system')
assert.equal(controller.getTheme(), 'dark')
assert.equal(dataset['theme'], 'dark')

// Cambio del sistema en caliente con «system»: reacciona solo.
mediaQueryStub.matches = false
mediaListeners.forEach((fn) => fn())
assert.equal(controller.getTheme(), 'light')
assert.equal(dataset['theme'], 'light')

// Con elección fija (oscuro), el cambio del sistema no mueve nada.
controller.setChoice('dark')
mediaQueryStub.matches = true
mediaListeners.forEach((fn) => fn())
assert.equal(dataset['theme'], 'dark')

// El select también cambia la elección.
selectStub.value = 'light'
selectListeners.forEach((fn) => fn())
assert.equal(controller.getChoice(), 'light')
assert.equal(dataset['theme'], 'light')

// El callback vio cada cambio de tema efectivo.
assert.ok(seen.length >= 5)
assert.deepEqual(seen[0], { theme: 'light', choice: 'system' })

// dispose() quita los listeners: después ya no reacciona. Con elección
// «light» y el sistema en oscuro, el tema efectivo sigue siendo claro.
controller.dispose()
assert.equal(mediaListeners.length, 0)
assert.equal(selectListeners.length, 0)
mediaQueryStub.matches = true
mediaListeners.forEach((fn) => fn())
assert.equal(dataset['theme'], 'light')

console.log('test-theme: OK')
