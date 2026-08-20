/** Canonical session URI and inline mention encoding. */

import { SessionId, type SessionId as SessionIdType } from '@truly-private/omdsh-session'
import { SessionReferenceError } from './config.ts'
import type { SessionReferenceInput } from './types.ts'

/** URI scheme reserved for DeepSeek Harness session snapshots. */
export const SESSION_REFERENCE_SCHEME = 'dsh-session:'

/**
 * Encode any JavaScript session-id string as a canonical lossless URI.
 * @param sessionId - opaque session id to serialize.
 * @returns canonical `dsh-session:` URI.
 */
export function encodeSessionReferenceUri(sessionId: SessionIdType): string {
  const payload = Buffer.from(JSON.stringify(sessionId), 'utf8').toString('base64url')
  return `${SESSION_REFERENCE_SCHEME}${payload}`
}

/**
 * Decode and canonicalize one session-reference URI.
 * @param uri - complete canonical URI.
 * @returns decoded session id.
 */
export function decodeSessionReferenceUri(uri: string): SessionIdType {
  if (!uri.startsWith(SESSION_REFERENCE_SCHEME)) {
    throw invalidUri(uri)
  }
  const payload = uri.slice(SESSION_REFERENCE_SCHEME.length)
  if (!/^[A-Za-z0-9_-]+$/.test(payload)) throw invalidUri(uri)
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof parsed !== 'string') throw new TypeError('decoded session id is not a string')
    const sessionId = SessionId(parsed)
    if (encodeSessionReferenceUri(sessionId) !== uri) throw new TypeError('URI is not canonical')
    return sessionId
  } catch (error: unknown) {
    throw invalidUri(uri, error)
  }
}

/**
 * Render a host-neutral Markdown mention carrying the canonical URI.
 * @param reference - structured id and optional display label.
 * @returns escaped `@[label](uri)` mention.
 */
export function formatSessionReferenceMention(reference: SessionReferenceInput): string {
  const label = escapeLabel(reference.label ?? reference.sessionId)
  return `@[${label}](${encodeSessionReferenceUri(reference.sessionId)})`
}

/** Result of extracting canonical mentions from plain text. */
export interface ParsedSessionReferenceText {
  /** Text with opaque tokens replaced by readable `@label` spans. */
  text: string
  /** Structured references in first-appearance order, before service deduplication. */
  references: SessionReferenceInput[]
}

function isBase64UrlCharacter(char: string | undefined): boolean {
  if (char === '_' || char === '-') return true
  if (char === undefined) return false
  const code = char.charCodeAt(0)
  return (code >= 0x30 && code <= 0x39)
    || (code >= 0x41 && code <= 0x5A)
    || (code >= 0x61 && code <= 0x7A)
}

function explicitLabelEnd(text: string, start: number): number | undefined {
  for (let cursor = start; cursor < text.length; cursor += 1) {
    if (text[cursor] === '\\') {
      cursor += 1
      continue
    }
    if (text[cursor] === ']') return cursor
  }
  return undefined
}

/**
 * Extract Markdown mentions and bare canonical URIs from one text value.
 * Explicit Markdown mentions fail on any malformed URI. Bare text is treated
 * as a reference only when it has a non-empty base64url-shaped payload, then
 * still fails if that candidate is not canonical.
 * @param text - host text to normalize.
 * @returns readable text and structured references in appearance order.
 */
export function parseSessionReferenceText(text: string): ParsedSessionReferenceText {
  const references: SessionReferenceInput[] = []
  const rendered: string[] = []
  let cursor = 0
  let explicitMentionsRemainPossible = true
  while (cursor < text.length) {
    if (explicitMentionsRemainPossible && text.startsWith('@[', cursor)) {
      const labelEnd = explicitLabelEnd(text, cursor + 2)
      if (labelEnd === undefined) {
        // No later nested `@[` can close before this opener, so continuing to
        // probe each one would make malformed text quadratic. Bare URIs still scan.
        explicitMentionsRemainPossible = false
      } else if (text[labelEnd + 1] === '(' && text.startsWith(SESSION_REFERENCE_SCHEME, labelEnd + 2)) {
        const uriStart = labelEnd + 2
        let uriEnd = uriStart + SESSION_REFERENCE_SCHEME.length
        while (text[uriEnd] !== undefined && text[uriEnd] !== ')' && !/\s/u.test(text[uriEnd] as string)) uriEnd += 1
        if (text[uriEnd] === ')') {
          const uri = text.slice(uriStart, uriEnd)
          const sessionId = decodeSessionReferenceUri(uri)
          const label = unescapeLabel(text.slice(cursor + 2, labelEnd))
          references.push({ sessionId, label })
          rendered.push(`@${label}`)
          cursor = uriEnd + 1
          continue
        }
      }
    }

    if (text.startsWith(SESSION_REFERENCE_SCHEME, cursor)) {
      let end = cursor + SESSION_REFERENCE_SCHEME.length
      while (isBase64UrlCharacter(text[end])) end += 1
      if (end > cursor + SESSION_REFERENCE_SCHEME.length) {
        const uri = text.slice(cursor, end)
        const sessionId = decodeSessionReferenceUri(uri)
        references.push({ sessionId, label: sessionId })
        rendered.push(`@${sessionId}`)
        cursor = end
        continue
      }
    }

    rendered.push(text[cursor] as string)
    cursor += 1
  }
  return { text: rendered.join(''), references }
}

function escapeLabel(label: string): string {
  return label.replace(/[\\\]]/gu, match => `\\${match}`)
}

function unescapeLabel(label: string): string {
  let rendered = ''
  for (let cursor = 0; cursor < label.length; cursor += 1) {
    if (label[cursor] === '\\' && label[cursor + 1] !== undefined) cursor += 1
    rendered += label.charAt(cursor)
  }
  return rendered
}

function invalidUri(uri: string, cause?: unknown): SessionReferenceError {
  return new SessionReferenceError(
    `invalid session reference URI ${JSON.stringify(uri)}`,
    'SESSION_REFERENCE_INVALID_REFERENCE',
    cause === undefined ? undefined : { cause },
  )
}
