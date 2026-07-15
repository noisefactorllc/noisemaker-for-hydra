export function formatError(err) {
  if (err == null) return 'unknown error'
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message || err.toString()
  if (typeof err === 'object') {
    if (Array.isArray(err.diagnostics) && err.diagnostics.length > 0) {
      return err.diagnostics.map(formatDiagnostic).join('; ')
    }
    if (Array.isArray(err.errors) && err.errors.length > 0) {
      return err.errors.map(formatDiagnostic).join('; ') || err.code || 'expansion failed'
    }
    if (typeof err.message === 'string' && err.message.length > 0) return err.message
    if (typeof err.error === 'string') return err.error
    try {
      const props = Object.getOwnPropertyNames(err)
      const dump = {}
      for (const property of props) dump[property] = err[property]
      const json = JSON.stringify(dump)
      if (json && json !== '{}') return json
    } catch (_) {}
    return err.code || Object.prototype.toString.call(err)
  }
  return String(err)
}

function formatDiagnostic(diagnostic) {
  if (diagnostic == null) return 'unknown'
  if (typeof diagnostic === 'string') return diagnostic
  const parts = []
  if (typeof diagnostic.message === 'string' && diagnostic.message.length > 0) {
    parts.push(diagnostic.message)
  }
  if (diagnostic.location) {
    const location = diagnostic.location
    const line = location.line != null ? location.line : location.row
    const column = location.col != null ? location.col : location.column
    if (line != null) {
      parts.push(`(line ${line}${column != null ? `, col ${column}` : ''})`)
    }
  }
  if (parts.length > 0) return parts.join(' ')
  try { return JSON.stringify(diagnostic) } catch (_) { return diagnostic.code || 'unknown diagnostic' }
}

export default {
  eval: (source = '', callback = () => {}) => {
    const info = { isError: false, codeString: source, errorMessage: '' }
    const renderer = window.hydraSynth
    if (!renderer || typeof renderer.compile !== 'function') {
      info.isError = true
      info.errorMessage = 'engine not ready — try again in a moment'
      callback(info)
      return
    }

    Promise.resolve(renderer.compile(source)).then(() => {
      callback(info)
    }).catch((error) => {
      info.isError = true
      info.errorMessage = formatError(error)
      callback(info)
    })
  }
}
