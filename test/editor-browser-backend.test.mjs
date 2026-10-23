import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = fileURLToPath(new URL('..', import.meta.url))
const driver = new URL('../scripts/test.mjs', import.meta.url).href

async function browserArguments(backend) {
  const reservation = createServer()
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve))
  const port = reservation.address().port
  await new Promise(resolve => reservation.close(resolve))
  const env = { ...process.env, PORT: String(port) }
  if (backend === undefined) delete env.GATE_GL_BACKEND
  else env.GATE_GL_BACKEND = backend
  // Run the real driver and dev server, stopping at the browser boundary.
  const probe = `
    import childProcess from 'node:child_process'
    import { syncBuiltinESMExports } from 'node:module'
    childProcess.spawnSync = (command, args) => {
      console.log('BROWSER_ARGUMENTS=' + JSON.stringify(args))
      throw new Error('browser launch captured')
    }
    syncBuiltinESMExports()
    await import(${JSON.stringify(driver)})
  `
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', probe], {
    cwd: root, env, encoding: 'utf8', timeout: 30000
  })
  assert.equal(result.error, undefined)
  assert.equal(result.status, 2, result.stderr)
  assert.match(result.stderr, /browser launch captured/)
  const captured = result.stdout.match(/^BROWSER_ARGUMENTS=(.+)$/m)
  assert.ok(captured, result.stdout)
  return JSON.parse(captured[1])
}

test('editor native backend request does not force software rendering', async () => {
  const args = await browserArguments('native')
  assert.ok(!args.some(arg => arg.startsWith('--use-gl=') || arg.startsWith('--use-angle=')))
  assert.ok(!args.includes('--enable-unsafe-swiftshader'))
})

test('editor retains software rendering when no native backend is requested', async () => {
  for (const backend of [undefined, 'swiftshader']) {
    const args = await browserArguments(backend)
    assert.ok(args.includes('--use-angle=swiftshader'))
    assert.ok(args.includes('--enable-unsafe-swiftshader'))
  }
})
