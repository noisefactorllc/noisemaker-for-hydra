// Compare WGSL (WebGPU, Deno/wgpu) frames against GLSL (WebGL2, chromium)
// frames for every generated Hydra program.
import { readFileSync, writeFileSync } from 'node:fs'

const wgsl = JSON.parse(readFileSync('/state/cache/scratch/gap4/wgsl-frames.json', 'utf8'))
const glsl = JSON.parse(readFileSync('/state/cache/scratch/gap4/glsl-frames.json', 'utf8'))
const key = r => `${r.name}::${r.case}`
const gmap = new Map(glsl.map(r => [key(r), r]))
const { programs: catalog, coverage } = JSON.parse(readFileSync('/state/cache/scratch/gap4/programs.json', 'utf8'))
const notRendered = catalog.filter(c => c.coverage).map(c => {
  const g = glsl.find(r => r.name === c.name)
  const w = wgsl.find(r => r.name === c.name)
  return { name: c.name, ...c.coverage,
    glslError: g && g.error ? JSON.parse(g.error) : null,
    wgslError: w && w.error ? JSON.parse(w.error) : null }
})

const report = []
const unreachable = new Set(notRendered.map(n => n.name))
for (const w of wgsl) {
  if (unreachable.has(w.name)) continue
  const g = gmap.get(key(w))
  if (!g) { report.push({ name: w.name, case: w.case, status: 'missing-gsl-ref', error: w.error || null }); continue }
  if (w.error || g.error) {
    report.push({ name: w.name, case: w.case, status: 'error', wgslError: w.error || null, glslError: g.error || null })
    continue
  }
  let maxDiff = 0
  let diffPixels = 0
  for (let i = 0; i < w.data.length; i++) {
    const d = Math.abs(w.data[i] - g.data[i])
    if (d > maxDiff) maxDiff = d
    if (d > 0 && i % 4 !== 3) diffPixels++ // count on color channels
  }
  report.push({
    name: w.name,
    case: w.case,
    status: maxDiff === 0 ? 'exact' : (maxDiff <= 1 ? 'near' : 'differs'),
    maxDiff,
    diffPixels
  })
}
const summary = {
  total: report.length,
  exact: report.filter(r => r.status === 'exact').length,
  near: report.filter(r => r.status === 'near').length,
  differs: report.filter(r => r.status === 'differs').length,
  errors: report.filter(r => r.status === 'error').length,
  missing: report.filter(r => r.status === 'missing-gsl-ref').length
}
writeFileSync('/state/cache/scratch/gap4/compare.json', JSON.stringify({ summary, report, notRendered, coverage }, null, 1))
console.log(JSON.stringify(summary))
for (const r of report.filter(r => r.status !== 'exact').slice(0, 40)) {
  console.log(r.status, r.name, r.case, r.maxDiff ?? '', r.diffPixels ?? '', (r.wgslError || r.glslError || '').slice(0, 200))
}
