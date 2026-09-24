import { useState } from 'react';
import { DialogComponent } from '@syncfusion/ej2-react-popups';
import type { Sku } from '../domain/types.ts';
import { available, validateAdjustStock } from '../domain/rules.ts';

export function AdjustStockDialog({ sku, onClose, onSubmit }: { sku: Sku; onClose: () => void; onSubmit: (delta: number, reason: string) => void }) {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState('Cycle count correction');
  const [error, setError] = useState('');

  function save() {
    const problem = validateAdjustStock(sku, delta);
    if (problem) { setError(problem); return; }
    onSubmit(delta, reason);
  }

  const buttons = [
    { buttonModel: { content: 'Cancel', cssClass: 'action-button' }, click: onClose },
    { buttonModel: { content: 'Save adjustment', isPrimary: true, cssClass: 'primary-button' }, click: save },
  ];

  return <DialogComponent header={`Adjust stock — ${sku.name}`} visible isModal showCloseIcon width="480px" target="#root" close={onClose} animationSettings={{ effect: 'None' }} buttons={buttons}>
    <p className="form-help">{sku.id} · On hand {sku.onHand} · Reserved {sku.reserved} · Available {available(sku)}</p>
    <form onSubmit={event => { event.preventDefault(); save(); }}>
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="adjust-delta">Change in on-hand units (positive to receive, negative to remove)</label>
          <input id="adjust-delta" type="number" value={delta}
            onChange={event => { setDelta(Number(event.target.value)); setError(''); }}
            style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--primary)' }} />
        </div>
        <div className="field full">
          <label htmlFor="adjust-reason">Reason</label>
          <input id="adjust-reason" type="text" value={reason} onChange={event => setReason(event.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--primary)' }} />
        </div>
      </div>
      <p className="form-help">Resulting on-hand: {sku.onHand + delta}. This is a session/browser-local change, never a shared write.</p>
      {error && <p className="notice error" role="alert">{error}</p>}
    </form>
  </DialogComponent>;
}
