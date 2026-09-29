import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(resolve(here, '../../index.html'), 'utf8')

/**
 * The backend brands the served shell by matching these exact anchors
 * (packages/api/src/cell_explorer_api/shell.py in cell-explorer-py). They are
 * literal substrings, so attribute order and spacing are load-bearing.
 *
 * If one of these fails, do not just fix the test: a branded deployment has
 * silently stopped applying that piece of branding, and the backend's anchor
 * must be updated in lockstep.
 */
const ANCHORS: [string, string | RegExp][] = [
  ['favicon (ico)', '<link rel="icon" href='],
  ['favicon (svg)', '<link rel="icon" type="image/svg+xml"'],
  ['apple touch icon', '<link rel="apple-touch-icon"'],
  ['theme-color meta', /<meta\s+name="theme-color"\s+content="[^"]*"/],
  ['title element', /<title>[^<]*<\/title>/],
]

describe('index.html keeps the anchors the backend templates against', () => {
  it.each(ANCHORS)('%s', (_name, anchor) => {
    if (typeof anchor === 'string') {
      expect(html).toContain(anchor)
    } else {
      expect(html).toMatch(anchor)
    }
  })

  it('has exactly one title element for the backend to replace', () => {
    expect(html.match(/<title>/g)).toHaveLength(1)
  })

  it('still links a web app manifest for the backend to serve branded', () => {
    expect(html).toContain('<link rel="manifest"')
  })
})
