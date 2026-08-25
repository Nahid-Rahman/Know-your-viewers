"use client";

/**
 * Browser-only holding area for the entry just submitted, so the hero's
 * "contact for follow-up" card and the confirmation screen can echo it back
 * immediately. The real submission is persisted via submitEntry()
 * (src/lib/actions/participant.ts) — this store only redisplays it, since
 * decrypting ParticipantContact for display is deliberately never done
 * (see src/lib/crypto.ts).
 */
export type MockEntry = {
  responseCode: string;
  rewardLabel: string;
  rewardRarity: "common" | "rare" | "exceptional" | "premium";
  email: string;
  phone: string;
  streamNickname: string;
  favouriteGameType: string;
  livestreamFrequency: string;
  submittedAt: string;
};

const KEY = "livedrop.mockEntry";
const UPDATE_EVENT = "livedrop:entry-updated";

export function saveMockEntry(entry: MockEntry) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(entry));
    window.dispatchEvent(new Event(UPDATE_EVENT));
  } catch {
    // sessionStorage unavailable (private mode, etc.) — non-fatal for the mock flow
  }
}

/** Lets same-tab listeners (e.g. the hero card) react to a save immediately — `storage` events only fire cross-tab. */
export function subscribeMockEntry(callback: () => void) {
  window.addEventListener(UPDATE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(UPDATE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

let cachedRaw: string | null | undefined;
let cachedEntry: MockEntry | null = null;

/**
 * Snapshot reader for useSyncExternalStore. Must return a referentially
 * stable value when the underlying storage hasn't changed, or React treats
 * every render as a new value and loops forever.
 */
export function loadMockEntry(): MockEntry | null {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedEntry = raw ? (JSON.parse(raw) as MockEntry) : null;
    } catch {
      cachedEntry = null;
    }
  }
  return cachedEntry;
}
