// Pure business rules: no framework or Syncfusion import, per app-plan.md's
// domain/application/adapter/UI boundary.
import type { Dataset, Kpis, Order, Sku, Stage } from './types.ts';
import { STAGE_ORDER } from './types.ts';

export function available(sku: Sku): number {
  return sku.onHand - sku.reserved;
}

export function stockState(sku: Sku): 'InStock' | 'Low' | 'Reorder' | 'OutOfStock' {
  const avail = available(sku);
  if (avail <= 0) return 'OutOfStock';
  if (avail <= sku.reorderPoint) return 'Reorder';
  if (avail <= sku.reorderPoint * 2) return 'Low';
  return 'InStock';
}

export function isAtRisk(order: Order, scenarioNow: string): boolean {
  return order.stage !== 'Delivered' && Date.parse(order.promisedDeliveryDate) < Date.parse(scenarioNow);
}

export function canAdvanceStage(from: Stage, to: Stage): boolean {
  const fromIndex = STAGE_ORDER.indexOf(from);
  const toIndex = STAGE_ORDER.indexOf(to);
  return toIndex === fromIndex + 1 && from !== 'Delivered';
}

export function computeKpis(dataset: Dataset): Kpis {
  const stockoutCount = dataset.skus.filter(sku => stockState(sku) === 'OutOfStock').length;
  const inventoryAccuracy = Math.max(90, 98.4 - stockoutCount * 0.1);
  const delivered = dataset.orders.filter(order => order.stage === 'Delivered');
  const onTime = delivered.filter(order => Date.parse(order.updatedAt) <= Date.parse(order.promisedDeliveryDate));
  const onTimeRate = delivered.length ? Math.round((onTime.length / delivered.length) * 1000) / 10 : null;
  const atRiskOrderCount = dataset.orders.filter(order => isAtRisk(order, dataset.scenarioNow)).length;
  return { inventoryAccuracy: Math.round(inventoryAccuracy * 10) / 10, onTimeRate, atRiskOrderCount, stockoutCount };
}

export function validateAdjustStock(sku: Sku, delta: number): string | null {
  if (sku.onHand + delta < sku.reserved) return `Cannot reduce on-hand below reserved quantity (${sku.reserved})`;
  if (sku.onHand + delta < 0) return 'On-hand cannot go negative';
  return null;
}

export function validateReorder(sku: Sku): string | null {
  const state = stockState(sku);
  if (state !== 'Reorder' && state !== 'OutOfStock') return 'Reorder is only available at or below the reorder point';
  return null;
}
