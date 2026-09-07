export function parseProgram(engine, source) {
  return engine.parse(engine.lex(source))
}

export function unparseProgram(engine, ast) {
  return engine.unparse(engine.validate(ast), {}, {
    getEffectDef: (name, namespace) => engine.getEffect(
      namespace ? `${namespace}.${name}` : name
    )
  })
}

export function formatProgram(engine, source) {
  return unparseProgram(engine, parseProgram(engine, source))
}
