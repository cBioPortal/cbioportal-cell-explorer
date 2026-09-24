import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(resolve(here, '../index.css'), 'utf8')

/**
 * `.ce-landing` in index.css must declare these four tokens as
 * `var(--brand-*, <literal>)`, not as bare literals. `applyBrandColors.ts`
 * only ever writes the `--brand-*` names (see that file); if `.ce-landing`
 * hardcodes `--ink` etc. directly, the override is silently severed — nothing
 * throws, nothing logs, the band just never rebrands. That is exactly the bug
 * this test exists to catch: a token re-hardcoded in the stylesheet.
 *
 * If this fails, do not relax the test — restore the `var(--brand-*, …)`
 * declaration in index.css. A failure here means branding has stopped
 * reaching the page, not that the assertion is too strict.
 */
const TOKENS: [cssVar: string, brandVar: string, fallback: string][] = [
  ['--ink', '--brand-ink', '#0d2c48'],
  ['--ink-deep', '--brand-ink-deep', '#061a2c'],
  ['--on-ink', '--brand-on-ink', '#eaf1f8'],
  ['--on-ink-muted', '--brand-on-ink-muted', '#93aec9'],
]

describe('.ce-landing keeps the brand override chain in index.css', () => {
  it('scopes the four tokens inside .ce-landing', () => {
    expect(css).toContain('.ce-landing {')
  })

  it.each(TOKENS)('%s falls back to its literal through %s', (cssVar, brandVar, fallback) => {
    expect(css).toContain(`${cssVar}: var(${brandVar}, ${fallback});`)
  })
})
