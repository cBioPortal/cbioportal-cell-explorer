import type { ZodIssue } from 'zod'

export type ApplyError =
  | { kind: 'schema_validation'; details: ZodIssue[] }
  | { kind: 'missing_companion'; field: 'gene' | 'category' }
  | { kind: 'field_value_invalid'; field: string; value: unknown; reason: string }
  | { kind: 'metadata_unavailable'; field: string }
  | { kind: 'internal'; message: string }

export type ApplyResult = { ok: true } | { ok: false; reason: ApplyError }

export function ok(): ApplyResult {
  return { ok: true }
}

export function err(reason: ApplyError): ApplyResult {
  return { ok: false, reason }
}

export function applyErrorMessage(reason: ApplyError): string {
  switch (reason.kind) {
    case 'schema_validation':
      return `Invalid config: ${reason.details.map((d) => d.message).join('; ')}`
    case 'missing_companion':
      return `Couldn't apply: colorBy is set but ${reason.field} is missing`
    case 'field_value_invalid':
      return `Couldn't apply: ${reason.field}=${JSON.stringify(reason.value)} — ${reason.reason}`
    case 'metadata_unavailable':
      return `Couldn't apply ${reason.field}: dataset metadata not available`
    case 'internal':
      return `Internal error: ${reason.message}`
  }
}
