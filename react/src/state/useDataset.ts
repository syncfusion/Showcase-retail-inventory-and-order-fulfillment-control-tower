import { useCallback, useMemo, useState } from 'react';
import type { Dataset, Stage } from '../domain/types.ts';
import { computeKpis, canAdvanceStage, validateAdjustStock, validateReorder } from '../domain/rules.ts';
import { loadInitialDataset, persistDataset, resetDataset } from '../adapters/sessionStore.ts';

// Customer persistence: browser (per intake/data-contract) — public visitors
// still only get session-only behavior at the UI layer (see App.tsx profile note).
const PERSIST_TO_BROWSER = true;

export function useDataset() {
  const [dataset, setDataset] = useState<Dataset>(() => loadInitialDataset(PERSIST_TO_BROWSER));
  const [error, setError] = useState('');

  const commit = useCallback((next: Dataset) => {
    setDataset(next);
    persistDataset(next, PERSIST_TO_BROWSER);
  }, []);

  const adjustStock = useCallback((skuId: string, delta: number, _reason: string) => {
    setError('');
    const sku = dataset.skus.find(candidate => candidate.id === skuId);
    if (!sku) return;
    const problem = validateAdjustStock(sku, delta);
    if (problem) { setError(problem); return; }
    commit({ ...dataset, skus: dataset.skus.map(candidate => candidate.id === skuId ? { ...candidate, onHand: candidate.onHand + delta } : candidate) });
  }, [dataset, commit]);

  const requestReorder = useCallback((skuId: string) => {
    setError('');
    const sku = dataset.skus.find(candidate => candidate.id === skuId);
    if (!sku) return;
    const problem = validateReorder(sku);
    if (problem) { setError(problem); return; }
    commit({ ...dataset, skus: dataset.skus.map(candidate => candidate.id === skuId ? { ...candidate, pendingReorder: true } : candidate) });
  }, [dataset, commit]);

  const moveOrderStage = useCallback((orderId: string, toStage: Stage) => {
    setError('');
    const order = dataset.orders.find(candidate => candidate.id === orderId);
    if (!order) return;
    if (!canAdvanceStage(order.stage, toStage)) { setError(`Cannot move order ${orderId} from ${order.stage} to ${toStage}`); return; }
    commit({ ...dataset, orders: dataset.orders.map(candidate => candidate.id === orderId ? { ...candidate, stage: toStage, updatedAt: dataset.scenarioNow } : candidate) });
  }, [dataset, commit]);

  const updatePromisedDate = useCallback((orderId: string, date: string) => {
    setError('');
    if (Date.parse(date) < Date.parse(dataset.scenarioNow)) { setError('Promised delivery date cannot be in the past'); return; }
    commit({ ...dataset, orders: dataset.orders.map(candidate => candidate.id === orderId ? { ...candidate, promisedDeliveryDate: date } : candidate) });
  }, [dataset, commit]);

  const reset = useCallback(() => { setError(''); setDataset(resetDataset(PERSIST_TO_BROWSER)); }, []);

  const kpis = useMemo(() => computeKpis(dataset), [dataset]);

  return { dataset, kpis, error, adjustStock, requestReorder, moveOrderStage, updatePromisedDate, reset };
}
