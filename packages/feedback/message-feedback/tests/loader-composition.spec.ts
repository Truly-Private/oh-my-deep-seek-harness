import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Include from '@deepseek-ai/cordis-plugin-include'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import SessionStore, { SessionId } from '@truly-private/omdsh-session'
import JsonlSessionPersistence from '@truly-private/omdsh-session-persistence-jsonl'
import Storage from '@truly-private/omdsh-storage'
import * as StorageDomain from '@truly-private/omdsh-storage-domain'
import * as StorageJson from '@truly-private/omdsh-storage-json'
import { remoteMethods } from '@truly-private/omdsh-typert-protocol'
import MessageFeedbackService from '../src/index.ts'
import { appendMessageFixture } from './helpers.ts'

let root: string | undefined
const contexts: Context[] = []

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})
async function loadComposition(configPath: string): Promise<Context> {
  const ctx = new Context()
  contexts.push(ctx)
  ctx.baseUrl = pathToFileURL(root as string).href + '/'
  await ctx.plugin(Loader)
  ctx.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['@truly-private/omdsh-session', SessionStore],
    ['@truly-private/omdsh-session-persistence-jsonl', JsonlSessionPersistence],
    ['@truly-private/omdsh-storage', Storage],
    ['@truly-private/omdsh-storage-json', StorageJson],
    ['@truly-private/omdsh-storage-domain', StorageDomain],
    ['@truly-private/omdsh-message-feedback', MessageFeedbackService],
  ])
  ctx.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof ctx.loader.internal>
  await ctx.loader.create({
    name: 'cordis:include',
    config: { path: pathToFileURL(configPath).href },
  })
  await ctx.loader.await()
  const unloaded = [...ctx.loader.entries()]
    .filter(entry => entry.fiber === undefined && !entry.disabled)
    .map(entry => entry.options.name)
  expect(unloaded).toEqual([])
  return ctx
}

describe('message feedback through a real Loader composition', () => {
  it('persists a checkpointed target and its sidecar across a cold restart', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-message-feedback-loader-'))
    const configPath = join(root, 'cordis.yml')
    await writeFile(configPath, [
      "- name: '@truly-private/omdsh-session'",
      "- name: '@truly-private/omdsh-session-persistence-jsonl'",
      '  config:',
      `    root: ${JSON.stringify(join(root, 'sessions'))}`,
      '    compression: none',
      '    writeBatchMaxDelayMs: 1',
      "- name: '@truly-private/omdsh-storage'",
      "- name: '@truly-private/omdsh-storage-json'",
      '  config:',
      `    root: ${JSON.stringify(join(root, 'storage'))}`,
      "- name: '@truly-private/omdsh-storage-domain'",
      '  config:',
      '    backend: json',
      "- name: '@truly-private/omdsh-message-feedback'",
      '  config:',
      '    maxNoteBytes: 32',
      '',
    ].join('\n'))

    const first = await loadComposition(configPath)
    expect(first.messageFeedback.typertRemote.namespace).toBe('messageFeedback')
    expect(remoteMethods(first.messageFeedback).map(marker => marker.method))
      .toEqual(['list', 'put', 'delete'])

    const session = first.sessions.create(SessionId('loader-feedback'), {
      meta: { cwd: root },
    })
    const fixture = appendMessageFixture(session)
    const put = await first.messageFeedback.put({
      sessionId: session.id,
      messageId: fixture.assistantMessageIds[0],
      rating: 'positive',
      note: 'survives restart',
      ifVersion: null,
    })
    if (!put.ok) throw new Error(`expected put success, got ${put.error.code}`)
    const durable = await first.sessionPersistence.readFrom(session.id, 0)
    expect(durable.events.some(event =>
      event.type === 'assistant/message'
      && event.data.message.id === fixture.assistantMessageIds[0])).toBe(true)

    await first.fiber.dispose()
    contexts.splice(contexts.indexOf(first), 1)

    const second = await loadComposition(configPath)
    await expect(second.messageFeedback.list({ sessionId: session.id })).resolves.toEqual({
      ok: true,
      value: { items: [put.value] },
    })
    expect(second.sessions.get(session.id)).toBeUndefined()
  })
})
