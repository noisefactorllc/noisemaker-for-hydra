// The 2.x branch's workflow contract.
//
// The test jobs run on every push to 2.x, and every release, notice or
// dispatch job runs only for main. A job runs only for main when its
// condition names refs/heads/main or a workflow_run head branch of main, or
// when every trigger of its workflow is a schedule (which runs only from the
// default branch) or a push or workflow_run filtered to main alone. This
// repository has no release, notice or dispatch workflow, and none is added:
// every workflow and every job in it is listed here by name.

import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const WORKFLOWS = fileURLToPath(new URL('../.github/workflows/', import.meta.url))

// Workflows whose jobs are test jobs, and must run on every 2.x push, with
// the name of every job each one holds.
const TEST_WORKFLOWS = {
  'parity-gate.yml': [
    'parity',
    'browser-windows'
  ]
}
// Workflows whose jobs release, notify or dispatch, and must run only for
// main. This repository has none.
const RELEASE_WORKFLOWS = []

const MAIN_ONLY_CONDITIONS = [
  /github\.ref\s*==\s*'refs\/heads\/main'/,
  /github\.event\.workflow_run\.head_branch\s*==\s*'main'/
]

const unquote = (text) => text.replace(/^['"]+|['"]+$/g, '')

function partition (text) {
  const at = text.indexOf(':')
  return at < 0 ? [text, ''] : [text.slice(0, at), text.slice(at + 1)]
}

function readLines (name) {
  const lines = []
  for (let raw of readFileSync(WORKFLOWS + name, 'utf8').split(/\r?\n/)) {
    raw = raw.replace(/\s+#[^'"]*$/, '')
    if (raw.trim() && !raw.trimStart().startsWith('#')) {
      lines.push([raw.length - raw.replace(/^ +/, '').length, raw.trim()])
    }
  }
  return lines
}

// Return [key, value, index] for each key one level below lines[start].
function children (lines, start, indent) {
  const found = []
  let child = null
  for (let index = start + 1; index < lines.length; index++) {
    const [depth, text] = lines[index]
    if (depth <= indent) break
    if (child === null) child = depth
    if (depth === child && !text.startsWith('- ')) {
      const [key, value] = partition(text)
      found.push([unquote(key.trim()), value.trim(), index])
    }
  }
  return found
}

// The scalar at lines[index]: inline, or a folded or literal block.
function block (lines, index) {
  const [depth, text] = lines[index]
  const value = partition(text)[1].trim()
  if (!['>', '|'].includes(value.slice(0, 1))) return value
  const parts = []
  for (let later = index + 1; later < lines.length; later++) {
    if (lines[later][0] <= depth) break
    parts.push(lines[later][1])
  }
  return parts.join(' ')
}

function top (lines, key) {
  const index = lines.findIndex(([depth, text]) =>
    depth === 0 && unquote(partition(text)[0].trim()) === key)
  if (index < 0) throw new assert.AssertionError({ message: `no top-level '${key}'` })
  return index
}

// Map each trigger to its branch filter (null when it has none).
function triggers (name) {
  const lines = readLines(name)
  const start = top(lines, 'on')
  const result = new Map()
  for (const [event, , index] of children(lines, start, 0)) {
    let branches = null
    for (const [key, inline, child] of children(lines, index, lines[index][0])) {
      if (key !== 'branches') continue
      if (inline.startsWith('[')) {
        branches = inline.replace(/^[[\]]+|[[\]]+$/g, '').split(',')
          .filter((b) => b.trim()).map((b) => unquote(b.trim()))
      } else {
        branches = []
        for (let later = child + 1; later < lines.length; later++) {
          const [depth, text] = lines[later]
          if (depth <= lines[child][0] && !text.startsWith('- ')) break
          if (text.startsWith('- ')) branches.push(unquote(text.slice(2).trim()))
        }
      }
    }
    result.set(event, branches)
  }
  return result
}

// Map each job to its condition ('' when it has none).
function jobs (name) {
  const lines = readLines(name)
  const start = top(lines, 'jobs')
  const result = new Map()
  for (const [job, , index] of children(lines, start, 0)) {
    let condition = ''
    for (const [key, , child] of children(lines, index, lines[index][0])) {
      if (key === 'if') condition = block(lines, child)
    }
    result.set(job, condition)
  }
  return result
}

function runsOnlyForMain (name, condition) {
  // A condition with an alternative can hold outside main, so only the
  // triggers can make such a job main-only.
  if (!condition.includes('||') && MAIN_ONLY_CONDITIONS.some((pattern) => pattern.test(condition))) {
    return true
  }
  for (const [event, branches] of triggers(name)) {
    if (event === 'schedule') continue
    if (['push', 'workflow_run'].includes(event) &&
        branches !== null && branches.length === 1 && branches[0] === 'main') continue
    return false
  }
  return true
}

for (const name of Object.keys(TEST_WORKFLOWS)) {
  test(`the test jobs of ${name} run on every 2.x push`, () => {
    const found = triggers(name)
    // A push trigger with no branch filter runs on every branch.
    assert.ok(found.has('push') && (found.get('push') === null || found.get('push').includes('2.x')),
      `${name} does not run on a 2.x push`)
    for (const [job, condition] of jobs(name)) {
      assert.ok(!condition.includes('refs/heads/main') || condition.includes('refs/heads/2.x'),
        `${name} job ${job} runs only for main: ${condition}`)
    }
  })
}

for (const name of RELEASE_WORKFLOWS) {
  test(`every release, notice or dispatch job of ${name} runs only for main`, () => {
    const found = jobs(name)
    assert.ok(found.size > 0, `${name} has no jobs`)
    for (const [job, condition] of found) {
      assert.ok(runsOnlyForMain(name, condition), `${name} job ${job} can run outside main`)
    }
  })
}

test('no release, notice or dispatch workflow or job exists outside the lists', () => {
  const listed = [...Object.keys(TEST_WORKFLOWS), ...RELEASE_WORKFLOWS].sort()
  const present = readdirSync(WORKFLOWS).filter((file) => /\.ya?ml$/.test(file)).sort()
  assert.deepEqual(present, listed, 'every workflow is listed as a test or a release workflow')
  for (const [name, names] of Object.entries(TEST_WORKFLOWS)) {
    assert.deepEqual([...jobs(name).keys()].sort(), [...names].sort(),
      `every job of ${name} is a listed test job`)
  }
})

test('the contract reader finds every workflow trigger and job', () => {
  for (const name of [...Object.keys(TEST_WORKFLOWS), ...RELEASE_WORKFLOWS]) {
    assert.ok(triggers(name).size > 0, `no triggers read from ${name}`)
    assert.ok(jobs(name).size > 0, `no jobs read from ${name}`)
  }
  assert.ok(jobs('parity-gate.yml').has('parity'))
  assert.ok(triggers('parity-gate.yml').has('push'))
})
