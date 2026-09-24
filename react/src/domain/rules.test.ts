import test from 'node:test';
import assert from 'node:assert/strict';
import { available, stockState, isAtRisk, canAdvanceStage, computeKpis, validateAdjustStock, validateReorder } from './rules.ts';
import type { Dataset, Sku } from './types.ts';

const sku = (overrides: Partial<Sku> = {}): Sku => ({
  id: 'sku-1', name: 'Test SKU', category: 'Electronics', warehouseId: 'wh-1',
  unitCost: 10, onHand: 20, reserved: 4, reorderPoint: 10, reorderQty: 40,
  lastRestockedAt: '2026-09-01', ...overrides
});

test('available subtracts reserved from on-hand', () => {
  assert.equal(available(sku({ onHand: 20, reserved: 4 })), 16);
});

test('stockState derives InStock/Low/Reorder/OutOfStock from available vs reorderPoint', () => {
  assert.equal(stockState(sku({ onHand: 4, reserved: 4 })), 'OutOfStock');
  assert.equal(stockState(sku({ onHand: 14, reserved: 4, reorderPoint: 10 })), 'Reorder');
  assert.equal(stockState(sku({ onHand: 24, reserved: 4, reorderPoint: 10 })), 'Low');
  assert.equal(stockState(sku({ onHand: 34, reserved: 4, reorderPoint: 10 })), 'InStock');
});

test('isAtRisk is true only for a non-delivered order past its promised date', () => {
  const now = '2026-09-22T12:00:00.000Z';
  assert.equal(isAtRisk({ id: 'o1', customer: 'x', items: [], stage: 'Packed', priority: 'Standard', promisedDeliveryDate: '2026-09-20', createdAt: now, updatedAt: now }, now), true);
  assert.equal(isAtRisk({ id: 'o2', customer: 'x', items: [], stage: 'Delivered', priority: 'Standard', promisedDeliveryDate: '2026-09-20', createdAt: now, updatedAt: now }, now), false);
  assert.equal(isAtRisk({ id: 'o3', customer: 'x', items: [], stage: 'Picking', priority: 'Standard', promisedDeliveryDate: '2026-09-25', createdAt: now, updatedAt: now }, now), false);
});

test('canAdvanceStage only allows the next stage in order, never skipping or leaving Delivered', () => {
  assert.equal(canAdvanceStage('Received', 'Picking'), true);
  assert.equal(canAdvanceStage('Received', 'Packed'), false);
  assert.equal(canAdvanceStage('Delivered', 'Received'), false);
});

test('computeKpis reflects live session state, not a static number', () => {
  const now = '2026-09-22T12:00:00.000Z';
  const dataset: Dataset = {
    fixtureVersion: 'test', scenarioNow: now,
    warehouses: [{ id: 'wh-1', name: 'W', region: 'Northeast' }],
    skus: [sku({ id: 'sku-1', onHand: 4, reserved: 4 }), sku({ id: 'sku-2', onHand: 40, reserved: 4 })],
    orders: [
      { id: 'o1', customer: 'x', items: [], stage: 'Delivered', priority: 'Standard', promisedDeliveryDate: '2026-09-20', createdAt: now, updatedAt: '2026-09-19T00:00:00.000Z' },
      { id: 'o2', customer: 'x', items: [], stage: 'Packed', priority: 'Standard', promisedDeliveryDate: '2026-09-20', createdAt: now, updatedAt: now }
    ]
  };
  const kpis = computeKpis(dataset);
  assert.equal(kpis.stockoutCount, 1);
  assert.equal(kpis.atRiskOrderCount, 1);
  assert.equal(kpis.onTimeRate, 100);
  assert.equal(kpis.inventoryAccuracy, 98.3);
});

test('validateAdjustStock rejects a delta that would go below reserved or negative', () => {
  assert.match(validateAdjustStock(sku({ onHand: 20, reserved: 4 }), -17) ?? '', /below reserved/);
  assert.equal(validateAdjustStock(sku({ onHand: 20, reserved: 4 }), -10), null);
});

test('validateReorder only allows a reorder at or below the reorder point', () => {
  assert.match(validateReorder(sku({ onHand: 34, reserved: 4, reorderPoint: 10 })) ?? '', /reorder point/);
  assert.equal(validateReorder(sku({ onHand: 14, reserved: 4, reorderPoint: 10 })), null);
});
