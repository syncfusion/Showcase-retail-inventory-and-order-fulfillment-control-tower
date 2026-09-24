import type { Dataset } from '../domain/types.ts';
import fixtureData from '../fixtures/dataset.json';

const STORAGE_KEY = 'retail-control-tower:v1';
const fixture = fixtureData as Dataset;

// Public profile: in-memory only (module-scope singleton, cleared on reload).
// Customer profile: additionally mirrored to localStorage, invalidated on a
// fixture-version mismatch instead of silently applying an incompatible overlay.
export function loadInitialDataset(persistToBrowser: boolean): Dataset {
  if (!persistToBrowser) return structuredClone(fixture);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(fixture);
    const stored = JSON.parse(raw) as Dataset;
    return stored.fixtureVersion === fixture.fixtureVersion ? stored : structuredClone(fixture);
  } catch {
    return structuredClone(fixture);
  }
}

export function persistDataset(dataset: Dataset, persistToBrowser: boolean): void {
  if (!persistToBrowser) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset)); } catch { /* Persistence is best-effort. */ }
}

export function resetDataset(persistToBrowser: boolean): Dataset {
  if (persistToBrowser) { try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } }
  return structuredClone(fixture);
}
