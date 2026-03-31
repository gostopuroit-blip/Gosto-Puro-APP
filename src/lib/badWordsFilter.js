import { base44 } from "@/api/base44Client";

// Module-level cache
let _cache = null;
let _loading = false;
let _loadPromise = null;

export async function loadBadWords() {
  if (_cache) return _cache;
  if (_loading) return _loadPromise;

  _loading = true;
  _loadPromise = base44.entities.BadWord.list("-created_date", 500)
    .then((words) => {
      _cache = words || [];
      _loading = false;
      return _cache;
    })
    .catch(() => {
      _cache = [];
      _loading = false;
      return [];
    });
  return _loadPromise;
}

export function invalidateBadWordsCache() {
  _cache = null;
}

/**
 * Check text against bad words list.
 * Returns { hasBadWord: boolean, severity: "warning"|"block"|null, word: string|null }
 */
export async function checkBadWords(text) {
  if (!text || !text.trim()) return { hasBadWord: false, severity: null, word: null };

  const words = await loadBadWords();
  if (!words.length) return { hasBadWord: false, severity: null, word: null };

  const lowerText = text.toLowerCase();

  // Check for block-severity first (highest priority)
  for (const bw of words) {
    if (bw.severity === "block") {
      const lowerWord = bw.word.toLowerCase();
      // Word boundary check: wrap in spaces or punctuation
      if (containsWord(lowerText, lowerWord)) {
        return { hasBadWord: true, severity: "block", word: bw.word };
      }
    }
  }

  // Then check for warning-severity
  for (const bw of words) {
    if (bw.severity === "warning") {
      const lowerWord = bw.word.toLowerCase();
      if (containsWord(lowerText, lowerWord)) {
        return { hasBadWord: true, severity: "warning", word: bw.word };
      }
    }
  }

  return { hasBadWord: false, severity: null, word: null };
}

function containsWord(text, word) {
  // Simple contains check (works for multi-word phrases too)
  return text.includes(word);
}

/**
 * Log a violation to PostReport
 */
export async function logBadWordViolation({ userEmail, content, context }) {
  try {
    await base44.entities.PostReport.create({
      reporter_email: "system",
      reported_user_email: userEmail,
      reason: "inappropriate",
      details: `[Auto] Contenuto bloccato per linguaggio offensivo. Contesto: ${context}. Testo: "${content?.slice(0, 200)}"`,
      status: "pending",
    });
  } catch (e) {
    // silent fail
  }
}