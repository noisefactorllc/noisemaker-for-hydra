// Validate every generated Hydra WGSL program by real WGSL compilation
// (device.createShaderModule) under Deno's wgpu/SwiftShader-Vulkan device.
import { readFileSync, readdirSync } from 'node:fs'

const adapter = await navigator.gpu.requestAdapter()
if (!adapter) throw new Error('no adapter')
const device = await adapter.requestDevice()
console.log('device ok')

const files = readdirSync('/state/cache/scratch/gap4/wgsl').filter(f => f.endsWith('.wgsl')).sort()
let ok = 0
const failures = []
for (const f of files) {
  const code = readFileSync(`/state/cache/scratch/gap4/wgsl/${f}`, 'utf8')
  const errors = []
  device.pushErrorScope?.('validation') // not in API; createShaderModule reports via compilationInfo
  const mod = device.createShaderModule({ code, label: f })
  const info = await mod.getCompilationInfo()
  for (const msg of info.messages) {
    if (msg.type === 'error') errors.push(`line ${msg.lineNum}: ${msg.message}`)
  }
  if (errors.length === 0) ok++
  else failures.push({ file: f, errors })
}
console.log(`compiled ${ok}/${files.length}`)
for (const fl of failures) {
  console.log('FAIL', fl.file, '::', fl.errors.slice(0, 4).join(' | '))
}
