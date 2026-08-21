import { spawn } from 'node:child_process'
import { createWriteStream, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const cwd = '/workspace'
const evidence = '/evidence'
const url = 'http://127.0.0.1:4173/?seed=314159&demo=1'

function run(command, args, logName) {
  return new Promise((resolve, reject) => {
    const log = createWriteStream(`${evidence}/${logName}`)
    const child = spawn(command, args, { cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })
    child.stdout.pipe(log)
    child.stderr.pipe(log)
    child.once('error', reject)
    child.once('close', code => code === 0 ? resolve() : reject(new Error(`${command} exited with status ${String(code)}`)))
  })
}

async function waitForServer(timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch (error) {
      if (!(error instanceof TypeError)) throw error
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error(`Development server did not become ready within ${timeoutMs} ms`)
}

await run('npm', ['test'], 'app-test.log').catch(error => {
  writeFileSync(`${evidence}/app-test-warning.txt`, `${error instanceof Error ? error.message : String(error)}\n`)
})
await run('npm', ['run', 'build'], 'app-build.log')

const serverLog = createWriteStream(`${evidence}/app-server.log`)
const server = spawn('npm', ['run', 'dev', '--', '--host', '0.0.0.0', '--port', '4173'], {
  cwd,
  env: process.env,
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
server.stdout.pipe(serverLog)
server.stderr.pipe(serverLog)

let browser
try {
  await waitForServer()
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  const page = await desktop.newPage()
  const consoleErrors = []
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  await page.goto(url, { waitUntil: 'networkidle' })
  const hooks = {}
  for (const name of ['game-canvas', 'score', 'round', 'start-game', 'restart-game']) {
    hooks[name] = await page.getByTestId(name).count()
  }
  await page.screenshot({ path: `${evidence}/desktop-start.png`, fullPage: true })
  const start = page.getByTestId('start-game')
  if (await start.count() > 0 && await start.first().isVisible()) {
    await start.first().click()
    await page.waitForTimeout(1500)
  }
  await page.screenshot({ path: `${evidence}/desktop-playing.png`, fullPage: true })
  await desktop.close()

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  const mobilePage = await mobile.newPage()
  await mobilePage.goto(url, { waitUntil: 'networkidle' })
  await mobilePage.screenshot({ path: `${evidence}/mobile-start.png`, fullPage: true })
  await mobile.close()

  const missingHooks = Object.entries(hooks).filter(([, count]) => count === 0).map(([name]) => name)
  writeFileSync(`${evidence}/ui-checks.json`, `${JSON.stringify({ url, hooks, missingHooks, consoleErrors }, null, 2)}\n`)
  if (missingHooks.length > 0) throw new Error(`Missing required data-testid hooks: ${missingHooks.join(', ')}`)
} finally {
  await browser?.close()
  if (server.pid !== undefined) {
    try {
      process.kill(-server.pid, 'SIGTERM')
    } catch (error) {
      if ((error).code !== 'ESRCH') throw error
    }
  }
  serverLog.end()
}
