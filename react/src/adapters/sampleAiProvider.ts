import type { Dataset } from '../domain/types.ts';
import { isAtRisk, stockState } from '../domain/rules.ts';
import type { AiAnswer, AiProviderPort, AiReference } from './aiProviderPort.ts';

// Deterministic, disclosed sample provider — grounded in the live session
// dataset passed in on every call, never a static script. See app-plan.md's
// AI section for supported tasks and factory/standards for the "no live
// inference, no embedded credentials" rule this satisfies.
export class SampleAiProvider implements AiProviderPort {
  async answer(question: string, dataset: Dataset, signal: AbortSignal): Promise<AiAnswer> {
    if (signal.aborted) throw new Error('The request was cancelled.');
    const query = question.toLowerCase();

    if (query.includes('risk') || query.includes('late') || query.includes('behind')) {
      const atRisk = dataset.orders.filter(order => isAtRisk(order, dataset.scenarioNow));
      if (!atRisk.length) return { text: 'No orders are at risk in the current session — everything not yet delivered is still within its promised date.', references: [] };
      const references: AiReference[] = atRisk.slice(0, 5).map(order => ({ kind: 'Order', id: order.id, label: `${order.id} — ${order.customer}` }));
      return {
        text: `${atRisk.length} order(s) are past their promised date and not yet delivered: ${atRisk.slice(0, 5).map(o => `${o.id} (${o.stage})`).join(', ')}${atRisk.length > 5 ? ', and others' : ''}. Consider moving these forward first.`,
        references
      };
    }

    if (query.includes('reorder') || query.includes('restock') || query.includes('stock')) {
      const candidates = dataset.skus.filter(sku => ['Reorder', 'OutOfStock'].includes(stockState(sku)));
      if (!candidates.length) return { text: 'No SKUs are at or below their reorder point in the current session.', references: [] };
      const references: AiReference[] = candidates.slice(0, 5).map(sku => ({ kind: 'SKU', id: sku.id, label: `${sku.id} — ${sku.name}` }));
      return {
        text: `${candidates.length} SKU(s) are at or below their reorder point: ${candidates.slice(0, 5).map(s => `${s.name} (suggest reordering ${s.reorderQty})`).join('; ')}${candidates.length > 5 ? ', and others' : ''}.`,
        references
      };
    }

    return {
      text: 'This sample assistant can answer questions about at-risk orders ("what\'s at risk", "what\'s behind schedule") and reorder needs ("what should I reorder"). It only reads the current session\'s data — it cannot change stock, move orders, or contact anyone.',
      references: []
    };
  }
}
