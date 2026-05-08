import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { AppConfigSchema } from '../src/config/schema.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const out = resolve(__dirname, '..', 'schema', 'app-config.schema.json')
mkdirSync(dirname(out), { recursive: true })

const jsonSchema = z.toJSONSchema(AppConfigSchema, {
  target: 'draft-2020-12',
})

writeFileSync(out, JSON.stringify(jsonSchema, null, 2) + '\n')
console.log(`Wrote ${out}`)
