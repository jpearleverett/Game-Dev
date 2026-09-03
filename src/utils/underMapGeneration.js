const UNDER_MAP_EMPTY_SIGNATURE = 'empty';
const EMPTY_PARTS_SIGNATURE = ['', '', '', '', ''].join('::');

export function underMapGenerationSignature(underMap) {
  if (!underMap || typeof underMap !== 'object') return UNDER_MAP_EMPTY_SIGNATURE;
  const normalizeList = (items, pick) => (Array.isArray(items) ? items : [])
    .map(pick)
    .filter(Boolean)
    .sort()
    .join('|');
  const nodes = normalizeList(
    underMap.nodes,
    (n) => n?.revelation && !n?.unresolvedReading
      ? `${n.id || ''}:${n.revelation}:${n.scope || 'chapter'}`
      : null,
  );
  const fragments = normalizeList(
    underMap.fragments,
    (f) => f?.id && f?.label
      ? `${f.id}:${f.label}:${f.kind || ''}:${f.seen || 1}`
      : null,
  );
  const theories = normalizeList(
    underMap.theories,
    (t) => t?.interpretation
      ? `${t.chapter || ''}:${t.interpretation}:${t.correct == null ? 'pending' : t.correct ? 'true' : 'false'}`
      : null,
  );
  // Dangling threads steer the narrative prompt (it lists them with the exact
  // missing label so the next scene can pay them off), so a scene prefetched
  // before a thread appeared is NOT valid for a map that now holds one. Leaving
  // them out let a stale scene pass the freshness check and be served as fresh.
  const latents = normalizeList(
    underMap.latentRelations,
    (l) => (l?.aLabel && l?.bLabel ? `${l.aLabel}~${l.bLabel}` : null),
  );
  const foil = underMap.foil?.belief
    ? `${underMap.foil.belief}:${underMap.foil.presence || 0}:${underMap.foil.name || ''}`
    : '';
  const signature = `${fragments}::${nodes}::${theories}::${latents}::${foil}`;
  // Five parts joined by four two-character separators, so an all-empty map is
  // eight colons. This compared against four and therefore never fired: a blank
  // map produced a long literal signature instead of the sentinel, and never
  // compared equal to one built from a map that was absent entirely.
  return signature === EMPTY_PARTS_SIGNATURE ? UNDER_MAP_EMPTY_SIGNATURE : signature;
}

export function compactUnderMapSignature(signature) {
  let hash = 2166136261;
  const text = String(signature || UNDER_MAP_EMPTY_SIGNATURE);
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `um_${(hash >>> 0).toString(36)}`;
}
