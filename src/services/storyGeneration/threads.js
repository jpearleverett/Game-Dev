import {
  LOCATION_SYNONYM_GROUPS,
  TRUNCATE_PREVIEW,
  VERB_SYNONYM_GROUPS,
} from './constants';

/**
 * Extract and track narrative threads that must be maintained
 * Uses LLM-generated threads when available, with regex fallback for legacy content
 */
function _extractNarrativeThreads(chapters) {
  const threads = [];
  const seenDescriptions = new Set(); // Prevent duplicate active threads in legacy mode

  // For structured threads, track latest status per normalized key so resolved threads
  // cannot "reappear" from earlier chapters (zombie thread bug).
  const latestByKey = new Map(); // key -> { thread, chapter, subchapter }

  // Track normalized IDs of threads that have been resolved/failed.
  // This prevents regex fallback from resurrecting them as "zombie threads".
  const resolvedThreadIds = new Set();

  // First priority: Use LLM-generated structured threads
  chapters.forEach(ch => {
    if (ch.narrativeThreads && Array.isArray(ch.narrativeThreads)) {
      ch.narrativeThreads.forEach(thread => {
        const type = thread?.type;
        const desc = thread?.description;
        const status = thread?.status;
        if (!type || !desc) return;

        const key = `${type}:${desc}`.toLowerCase();

        // Track resolved/failed threads to prevent regex resurrection
        if (status === 'resolved' || status === 'failed') {
          const normalizedId = this._normalizeThreadId(thread);
          if (normalizedId) {
            resolvedThreadIds.add(normalizedId);
          }
        }

        const candidate = {
          type,
          chapter: ch.chapter,
          subchapter: ch.subchapter,
          description: desc,
          characters: thread.characters || [],
          status: status || 'active',
          urgency: thread.urgency,
          deadline: thread.deadline,
          dueChapter: thread.dueChapter,
          resolvedChapter: thread.resolvedChapter,
          source: 'llm',
        };

        const existing = latestByKey.get(key);
        const isNewer = !existing ||
          (candidate.chapter > existing.chapter) ||
          (candidate.chapter === existing.chapter && candidate.subchapter > existing.subchapter);
        if (isNewer) {
          latestByKey.set(key, { ...candidate, chapter: candidate.chapter, subchapter: candidate.subchapter });
        }
      });
    }
  });

  // Materialize only active structured threads (latest status wins).
  // If a thread was resolved/failed later, it won't show up here.
  for (const [, t] of latestByKey.entries()) {
    if (t.status === 'active') {
      threads.push(t);
    }
  }

  // Fallback: Regex extraction for chapters without LLM threads (legacy content)
  const threadPatterns = [
    { pattern: /agreed to meet|promised to|will (meet|call|contact)/i, type: 'appointment' },
    { pattern: /discovered|revealed|learned that/i, type: 'revelation' },
    { pattern: /suspects?|investigating|following/i, type: 'investigation' },
    { pattern: /trust|betray|alliance|enemy/i, type: 'relationship' },
    { pattern: /wounded|injured|hurt|sick/i, type: 'physical_state' },
    { pattern: /swore|vowed|will make.*pay|threatened/i, type: 'threat' },
    { pattern: /promised|gave.*word|committed to/i, type: 'promise' },
  ];

  chapters.forEach(ch => {
    // Skip if we already have LLM threads for this chapter
    if (ch.narrativeThreads && ch.narrativeThreads.length > 0) return;
    if (!ch.narrative) return;

    threadPatterns.forEach(({ pattern, type }) => {
      const regex = new RegExp(`.{0,50}${pattern.source}.{0,50}`, 'gi');
      const matchIterator = ch.narrative.matchAll(regex);

      for (const match of matchIterator) {
        let excerpt = match[0].trim();
        const startIdx = match.index;

        // Fix: Trim to word boundaries to avoid "oria Blackwell" instead of "Victoria Blackwell"
        // Check if we started mid-word (character before match is alphanumeric)
        if (startIdx > 0 && /\w/.test(ch.narrative[startIdx - 1])) {
          const firstSpace = excerpt.indexOf(' ');
          if (firstSpace > 0 && firstSpace < 20) {
            excerpt = excerpt.slice(firstSpace + 1).trim();
          }
        }

        // Check if we ended mid-word (character after match is alphanumeric)
        const endIdx = startIdx + match[0].length;
        if (endIdx < ch.narrative.length && /\w/.test(ch.narrative[endIdx])) {
          const lastSpace = excerpt.lastIndexOf(' ');
          if (lastSpace > excerpt.length - 20 && lastSpace > 0) {
            excerpt = excerpt.slice(0, lastSpace).trim();
          }
        }

        const key = `${type}:${excerpt}`.toLowerCase();

        // Build candidate to check its normalized ID against resolved threads
        const candidate = { type, description: excerpt };
        const normalizedId = this._normalizeThreadId(candidate);

        // Only add if not a duplicate AND not previously resolved (zombie prevention)
        const isResolved = normalizedId && resolvedThreadIds.has(normalizedId);
        if (!seenDescriptions.has(key) && !isResolved) {
          seenDescriptions.add(key);
          threads.push({
            type,
            chapter: ch.chapter,
            subchapter: ch.subchapter,
            description: excerpt,
            excerpt, // Keep for backwards compatibility
            status: 'active',
            urgency: 'background',
            source: 'regex', // Track that this came from regex fallback
          });
        }
      }
    });
  });

  // Sort by chapter/subchapter and keep most recent threads (last 20)
  threads.sort((a, b) => {
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.subchapter - b.subchapter;
  });

  return threads.slice(-20);
}

/**
 * Get a formatted summary of active narrative threads for the LLM context
 */
function _formatNarrativeThreadsForContext(threads) {
  if (!threads || threads.length === 0) {
    return 'No active narrative threads to maintain.';
  }

  const groupedByType = {};
  threads.forEach(thread => {
    if (!groupedByType[thread.type]) {
      groupedByType[thread.type] = [];
    }
    groupedByType[thread.type].push(thread);
  });

  const lines = ['## ACTIVE NARRATIVE THREADS (must be addressed or acknowledged)'];

  const typeLabels = {
    appointment: 'SCHEDULED MEETINGS/APPOINTMENTS',
    revelation: 'RECENT DISCOVERIES',
    investigation: 'ONGOING INVESTIGATIONS',
    relationship: 'RELATIONSHIP CHANGES',
    physical_state: 'PHYSICAL CONDITIONS',
    promise: 'PROMISES MADE',
    threat: 'THREATS/WARNINGS',
  };

  for (const [type, typeThreads] of Object.entries(groupedByType)) {
    lines.push(`\n### ${typeLabels[type] || type.toUpperCase()}`);
    typeThreads.forEach(t => {
      const chapterInfo = `(Ch ${t.chapter}.${t.subchapter})`;
      const chars = t.characters?.length > 0 ? ` [${t.characters.join(', ')}]` : '';
      lines.push(`- ${t.description}${chars} ${chapterInfo}`);
    });
  }

  return lines.join('\n');
}

/**
 * Stem common verb endings to base form
 */
function _stemVerb(word) {
  if (!word) return word;
  const w = word.toLowerCase();

  // Handle common verb forms
  if (w.endsWith('ing')) return w.slice(0, -3).replace(/([^aeiou])$/, '$1'); // meeting -> meet
  if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2).replace(/i$/, 'y'); // promised -> promis -> promise handled below
  if (w.endsWith('ied')) return w.slice(0, -3) + 'y'; // tried -> try
  if (w.endsWith('es') && w.length > 4) return w.slice(0, -2); // watches -> watch
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1); // meets -> meet

  // Fix common stemming artifacts
  const fixes = {
    'promis': 'promise', 'agre': 'agree', 'arriv': 'arrive',
    'observ': 'observe', 'investigat': 'investigate', 'determin': 'determine',
    'realiz': 'realize', 'pressur': 'pressure', 'threaten': 'threaten',
  };
  return fixes[w] || w;
}

/**
 * Get the canonical verb for a given verb (using synonym groups)
 */
function _getCanonicalVerb(verb) {
  const stemmed = this._stemVerb(verb);
  for (const group of VERB_SYNONYM_GROUPS) {
    if (group.some(v => v === stemmed || stemmed.includes(v) || v.includes(stemmed))) {
      return group[0]; // Return the canonical (first) verb in group
    }
  }
  return stemmed;
}

/**
 * Get the canonical location for a given location (using synonym groups)
 */
function _getCanonicalLocation(location) {
  const loc = location.toLowerCase();
  for (const group of LOCATION_SYNONYM_GROUPS) {
    if (group.some(l => loc.includes(l) || l.includes(loc))) {
      return group[0]; // Return the canonical (first) location in group
    }
  }
  return loc;
}

/**
 * Normalize a thread to a canonical ID for deduplication
 * Format: {type}:{sorted_entities}:{canonical_action}:{canonical_location}:{time_bucket}
 *
 * Uses semantic normalization:
 * - Verbs are stemmed and mapped to canonical synonyms
 * - Locations are mapped to canonical synonyms
 * - Time references are bucketed (morning/noon/evening/night)
 */
function _normalizeThreadId(thread) {
  if (!thread || !thread.description) return null;

  const type = thread.type || 'unknown';
  const description = thread.description.toLowerCase();

  // Extract canonical character names mentioned in the thread
  // Only Jack and Victoria are canonical - other character names are LLM-generated
  const canonicalCharacters = ['jack', 'victoria', 'blackwell'];

  const mentionedCharacters = canonicalCharacters
    .filter(name => description.includes(name))
    .sort();

  // Extract and canonicalize action verbs
  const actionPattern = /\b(meet|see|visit|visit|come|arrive|show|promise|agree|commit|vow|swear|pledge|investigate|search|look|examine|check|confront|face|challenge|accuse|question|interrogate|follow|track|tail|shadow|pursue|watch|observe|call|phone|contact|reach|message|find|discover|uncover|reveal|learn|threaten|warn|intimidate|meeting|seeing|visiting|coming|arriving|promising|agreeing|investigating|searching|confronting|following|tracking|calling|finding|discovering|threatening)[a-z]*/gi;
  const foundActions = description.match(actionPattern) || [];
  const canonicalActions = [...new Set(foundActions.map(a => this._getCanonicalVerb(a)))].sort();

  // Extract time references and bucket them
  const timeBuckets = {
    morning: /\b(morning|dawn|sunrise|am|breakfast|early)\b/i,
    noon: /\b(noon|midday|lunch|afternoon)\b/i,
    evening: /\b(evening|sunset|dusk|dinner|pm)\b/i,
    night: /\b(night|midnight|late|tonight)\b/i,
    tomorrow: /\b(tomorrow|next day)\b/i,
  };

  let timeBucket = null;
  for (const [bucket, pattern] of Object.entries(timeBuckets)) {
    if (pattern.test(description)) {
      timeBucket = bucket;
      break;
    }
  }

  // Extract and canonicalize location references
  const locations = [
    'docks', 'pier', 'wharf', 'warehouse', 'office', 'precinct', 'greystone', 'prison',
    'bar', 'murphy', 'apartment', 'morgue', 'courthouse', 'alley', 'waterfront',
    'harbor', 'building', 'factory', 'home', 'place', 'penthouse'
  ];
  const foundLocations = locations.filter(loc => description.includes(loc));
  const canonicalLocation = foundLocations.length > 0
    ? this._getCanonicalLocation(foundLocations[0])
    : null;

  // Build normalized ID with canonical forms
  const parts = [type];
  if (mentionedCharacters.length > 0) parts.push(mentionedCharacters.join(','));
  if (canonicalActions.length > 0) parts.push(canonicalActions[0]); // Primary canonical action
  if (canonicalLocation) parts.push(canonicalLocation);
  if (timeBucket) parts.push(timeBucket);

  return parts.join(':');
}

/**
 * Calculate semantic similarity score between two threads (0-1)
 * Used for fuzzy matching when normalized IDs don't match exactly
 */
function _calculateThreadSimilarity(thread1, thread2) {
  if (!thread1?.description || !thread2?.description) return 0;

  const desc1 = thread1.description.toLowerCase();
  const desc2 = thread2.description.toLowerCase();

  let score = 0;
  let factors = 0;

  // Same type is a strong signal
  if (thread1.type === thread2.type) {
    score += 0.3;
  }
  factors += 0.3;

  // Extract and compare canonical characters
  // Only Jack and Victoria are canonical - other character names are LLM-generated
  const canonicalCharacters = ['jack', 'victoria', 'blackwell'];

  const chars1 = new Set(canonicalCharacters.filter(c => desc1.includes(c)));
  const chars2 = new Set(canonicalCharacters.filter(c => desc2.includes(c)));
  const charIntersection = [...chars1].filter(c => chars2.has(c)).length;
  const charUnion = new Set([...chars1, ...chars2]).size;

  if (charUnion > 0) {
    score += 0.35 * (charIntersection / charUnion); // Jaccard similarity for characters
  }
  factors += 0.35;

  // Compare canonical actions
  const actionPattern = /\b(meet|see|visit|promise|agree|investigate|search|confront|follow|track|call|find|discover|threaten|watch|observe)[a-z]*/gi;
  const actions1 = [...new Set((desc1.match(actionPattern) || []).map(a => this._getCanonicalVerb(a)))];
  const actions2 = [...new Set((desc2.match(actionPattern) || []).map(a => this._getCanonicalVerb(a)))];

  const actionIntersection = actions1.filter(a => actions2.includes(a)).length;
  const actionUnion = new Set([...actions1, ...actions2]).size;

  if (actionUnion > 0) {
    score += 0.25 * (actionIntersection / actionUnion);
  }
  factors += 0.25;

  // Compare locations
  const locations = [
    'docks', 'pier', 'warehouse', 'office', 'precinct', 'greystone', 'prison',
    'bar', 'apartment', 'morgue', 'courthouse', 'alley', 'waterfront'
  ];
  const locs1 = locations.filter(l => desc1.includes(l)).map(l => this._getCanonicalLocation(l));
  const locs2 = locations.filter(l => desc2.includes(l)).map(l => this._getCanonicalLocation(l));

  if (locs1.length > 0 && locs2.length > 0) {
    const locMatch = locs1.some(l1 => locs2.includes(l1));
    if (locMatch) score += 0.1;
  }
  factors += 0.1;

  return score / factors; // Normalize to 0-1
}

/**
 * Deduplicate threads using normalized IDs AND semantic similarity
 * Two-pass approach: exact match first, then fuzzy match for remaining
 */
function _deduplicateThreads(threads) {
  if (!threads || threads.length === 0) return [];

  const seen = new Map();
  const deduplicated = [];
  const urgencyRank = { critical: 3, normal: 2, background: 1 };

  // PASS 1: Exact normalized ID matching
  for (const thread of threads) {
    const normalizedId = this._normalizeThreadId(thread);

    if (!normalizedId) {
      deduplicated.push(thread);
      continue;
    }

    if (!seen.has(normalizedId)) {
      seen.set(normalizedId, thread);
      thread._normalizedId = normalizedId;
      deduplicated.push(thread);
    } else {
      // Merge: keep the more urgent version, or the more recent if equal urgency
      const existing = seen.get(normalizedId);

      const urgencyA = (urgencyRank[thread.urgency] || 0);
      const urgencyB = (urgencyRank[existing.urgency] || 0);
      const isNewer = (thread.chapter > existing.chapter) ||
        (thread.chapter === existing.chapter && (thread.subchapter || 0) > (existing.subchapter || 0));

      if (urgencyA > urgencyB || (urgencyA === urgencyB && isNewer)) {
        const idx = deduplicated.indexOf(existing);
        if (idx !== -1) {
          thread._normalizedId = normalizedId;
          deduplicated[idx] = thread;
          seen.set(normalizedId, thread);
        }
      }

      console.log(`[StoryGenerationService] Deduplicated thread (exact): "${thread.description?.slice(0, 50)}..." (normalized: ${normalizedId})`);
    }
  }

  // PASS 2: Semantic similarity matching for remaining duplicates
  // Only run if we have enough threads to warrant the cost
  if (deduplicated.length > 3) {
    const SIMILARITY_THRESHOLD = 0.75; // Threads with >75% similarity are considered duplicates
    const toRemove = new Set();

    for (let i = 0; i < deduplicated.length; i++) {
      if (toRemove.has(i)) continue;

      for (let j = i + 1; j < deduplicated.length; j++) {
        if (toRemove.has(j)) continue;

        // Skip if already matched by normalized ID
        if (deduplicated[i]._normalizedId === deduplicated[j]._normalizedId) continue;

        const similarity = this._calculateThreadSimilarity(deduplicated[i], deduplicated[j]);

        if (similarity >= SIMILARITY_THRESHOLD) {
          // Keep the more urgent one, or the first one if equal urgency
          const urgencyI = urgencyRank[deduplicated[i].urgency] || 0;
          const urgencyJ = urgencyRank[deduplicated[j].urgency] || 0;

          if (urgencyJ > urgencyI) {
            toRemove.add(i);
            console.log(`[StoryGenerationService] Deduplicated thread (semantic ${(similarity * 100).toFixed(0)}%): "${deduplicated[i].description?.slice(0, 40)}..." ~= "${deduplicated[j].description?.slice(0, 40)}..."`);
          } else {
            toRemove.add(j);
            console.log(`[StoryGenerationService] Deduplicated thread (semantic ${(similarity * 100).toFixed(0)}%): "${deduplicated[j].description?.slice(0, 40)}..." ~= "${deduplicated[i].description?.slice(0, 40)}..."`);
          }
        }
      }
    }

    // Remove duplicates found in pass 2
    if (toRemove.size > 0) {
      return deduplicated.filter((_, idx) => !toRemove.has(idx));
    }
  }

  return deduplicated;
}

/**
 * Cap active threads to prevent state explosion
 * Keeps critical threads, most recent, and auto-resolves old background threads
 */
function _capActiveThreads(threads, maxThreads = 20) {
  if (!threads || threads.length <= maxThreads) return threads;

  // Separate by urgency
  const critical = threads.filter(t => t.urgency === 'critical' && t.status === 'active');
  const normal = threads.filter(t => t.urgency === 'normal' && t.status === 'active');
  const background = threads.filter(t => t.urgency === 'background' && t.status === 'active');
  const resolved = threads.filter(t => t.status !== 'active');

  // Always keep all critical threads
  const kept = [...critical];

  // Add normal threads up to limit
  const remainingSlots = maxThreads - kept.length;
  const normalToKeep = normal.slice(0, Math.min(normal.length, Math.ceil(remainingSlots * 0.6)));
  kept.push(...normalToKeep);

  // Add background threads with remaining slots
  const backgroundSlots = maxThreads - kept.length;
  const backgroundToKeep = background.slice(0, backgroundSlots);
  kept.push(...backgroundToKeep);

  // Auto-resolve old background threads that didn't make the cut
  const autoResolved = background.slice(backgroundSlots).map(t => ({
    ...t,
    status: 'resolved',
    _autoResolved: true,
    _autoResolveReason: 'Thread cap reached - background thread auto-closed',
  }));

  console.log(`[StoryGenerationService] Thread cap: kept ${kept.length}, auto-resolved ${autoResolved.length} background threads`);

  return [...kept, ...autoResolved, ...resolved];
}

// ==========================================================================
// THREAD ARCHIVAL SYSTEM
// ==========================================================================

/**
 * Archive resolved threads to reduce active memory pressure
 * Stores compressed version of thread with minimal fields needed for callbacks
 * @param {Array} threads - Array of threads to process
 * @param {number} currentChapter - Current chapter number for age calculation
 */
function _archiveResolvedThreads(threads, currentChapter) {
  if (!threads || threads.length === 0) return threads;

  const activeThreads = [];
  const toArchive = [];

  for (const thread of threads) {
    // Keep active threads in main list
    if (thread.status === 'active') {
      activeThreads.push(thread);
      continue;
    }

    // Resolved/failed threads get archived
    if (thread.status === 'resolved' || thread.status === 'failed') {
      toArchive.push(thread);
    } else {
      // Unknown status - keep in active list to be safe
      activeThreads.push(thread);
    }
  }

  // Archive resolved threads with compression
  for (const thread of toArchive) {
    const compressedThread = {
      type: thread.type,
      description: thread.description?.slice(0, TRUNCATE_PREVIEW), // Truncate for context
      status: thread.status,
      resolvedChapter: thread.resolvedChapter || currentChapter,
      characters: thread.characters?.slice(0, 3) || [], // Keep max 3 characters
      originalChapter: thread.chapter,
    };

    // Check if similar thread already archived (avoid duplicates)
    const isDuplicate = this.archivedThreads.some(archived =>
      archived.type === compressedThread.type &&
      archived.description === compressedThread.description
    );

    if (!isDuplicate) {
      this.archivedThreads.push(compressedThread);
    }
  }

  if (toArchive.length > 0) {
    console.log(`[StoryGenerationService] Archived ${toArchive.length} resolved threads (archive size: ${this.archivedThreads.length})`);
  }

  // Prune old archived threads based on chapter distance
  this._pruneArchivedThreads(currentChapter);

  return activeThreads;
}

/**
 * Prune archived threads that are too old to be relevant for callbacks
 * Keeps threads within archiveChapterRetention chapters of resolution
 */
function _pruneArchivedThreads(currentChapter) {
  const originalCount = this.archivedThreads.length;

  // Remove threads resolved more than N chapters ago
  this.archivedThreads = this.archivedThreads.filter(thread => {
    const chapterDistance = currentChapter - (thread.resolvedChapter || 0);
    return chapterDistance <= this.archiveChapterRetention;
  });

  // Also cap total archive size
  if (this.archivedThreads.length > this.maxArchivedThreads) {
    // Sort by resolution chapter (oldest first) and remove oldest
    this.archivedThreads.sort((a, b) => (a.resolvedChapter || 0) - (b.resolvedChapter || 0));
    this.archivedThreads = this.archivedThreads.slice(-this.maxArchivedThreads);
  }

  const pruned = originalCount - this.archivedThreads.length;
  if (pruned > 0) {
    console.log(`[StoryGenerationService] Pruned ${pruned} old archived threads (remaining: ${this.archivedThreads.length})`);
  }
}

export const threadMethods = {
  _extractNarrativeThreads,
  _formatNarrativeThreadsForContext,
  _stemVerb,
  _getCanonicalVerb,
  _getCanonicalLocation,
  _normalizeThreadId,
  _calculateThreadSimilarity,
  _deduplicateThreads,
  _capActiveThreads,
  _archiveResolvedThreads,
  _pruneArchivedThreads,
};
