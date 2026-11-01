// A cached slice report may only be reused when it was produced for the same
// fixture revision AND the same slice size (limit) AND the same cases. Reuse
// keyed by fixture sha alone silently merged single-case (limit 1) slice
// reports into a batched run (GATE_BATCH=5 over limit-1 slice caches),
// dropping 168 cases from the merged denominator with missing=0; the case-id
// check additionally keeps two shard runs sharing one evidence directory from
// reusing each other's slice reports for different case slices. Kept in a
// side-effect-free module so the unit suite can import it without starting
// the gate's server.
export function sliceCacheReusable (cached, fixtureSha256, limit, firstCaseId) {
  return Boolean(
    cached && cached.fixture && cached.fixture.sha256 === fixtureSha256 &&
    (!cached.slice || cached.slice.limit === limit) &&
    (!firstCaseId || cached.caseStatus && cached.caseStatus[0] && cached.caseStatus[0].id === firstCaseId)
  )
}
