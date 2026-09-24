import { useState } from 'react';
import { KanbanComponent, ColumnsDirective, ColumnDirective } from '@syncfusion/ej2-react-kanban';
import type { DragEventArgs } from '@syncfusion/ej2-kanban';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import type { Dataset, Order, Stage } from '../domain/types.ts';
import { STAGE_ORDER } from '../domain/types.ts';
import { isAtRisk } from '../domain/rules.ts';
import { PromisedDateDialog } from '../components/PromisedDateDialog.tsx';

export function Fulfillment({ dataset, error, onMoveStage, onUpdatePromisedDate }: {
  dataset: Dataset; error: string;
  onMoveStage: (orderId: string, toStage: Stage) => void;
  onUpdatePromisedDate: (orderId: string, date: string) => void;
}) {
  const [editing, setEditing] = useState<Order | null>(null);

  function dragStop(args: DragEventArgs) {
    // Kanban updates its own in-memory copy before this fires; React state is
    // the source of truth, so cancel that update and commit a validated command.
    args.cancel = true;
    const moved = args.data[0] as Partial<Order> | undefined;
    const order = moved?.id ? dataset.orders.find(item => item.id === moved.id) : undefined;
    const target = moved?.stage;
    if (!order || !target || target === order.stage) return;
    onMoveStage(order.id, target as Stage);
  }

  return <>
    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="board-scroll">
      <KanbanComponent id="fulfillment-board" keyField="stage" dataSource={dataset.orders} allowDragAndDrop
        dragStop={dragStop} dialogOpen={args => { args.cancel = true; }}
        cardSettings={{
          headerField: 'id', contentField: 'customer',
          template: (order: Order) => {
            const atRisk = isAtRisk(order, dataset.scenarioNow);
            return <div className={`board-card${atRisk ? ' at-risk' : ''}`} data-testid={`card-${order.id}`}>
              <span className="board-id">{order.id} · {order.priority}</span>
              <h3>{order.customer}</h3>
              <p>{order.items.reduce((sum, item) => sum + item.qty, 0)} unit(s)</p>
              <p style={{ color: atRisk ? 'var(--error)' : undefined }}>
                Promised {order.promisedDeliveryDate}{atRisk ? ' — at risk' : ''}
              </p>
              <ButtonComponent cssClass="action-button" onClick={() => setEditing(order)} aria-label={`Edit promised date for ${order.id}`}>Edit date</ButtonComponent>
              {STAGE_ORDER.indexOf(order.stage) < STAGE_ORDER.length - 1 &&
                <ButtonComponent cssClass="action-button" onClick={() => onMoveStage(order.id, STAGE_ORDER[STAGE_ORDER.indexOf(order.stage) + 1])}
                  aria-label={`Move ${order.id} to ${STAGE_ORDER[STAGE_ORDER.indexOf(order.stage) + 1]}`}>
                  Move to {STAGE_ORDER[STAGE_ORDER.indexOf(order.stage) + 1]}
                </ButtonComponent>}
            </div>;
          }
        }}>
        <ColumnsDirective>
          {STAGE_ORDER.map(stage => <ColumnDirective key={stage} headerText={stage} keyField={stage}
            allowToggle={false} {...(stage === 'Picking' || stage === 'Packed' ? { constraintCount: 5 } : {})} />)}
        </ColumnsDirective>
      </KanbanComponent>
    </div>
    {editing && <PromisedDateDialog order={editing} onClose={() => setEditing(null)}
      onSubmit={date => { onUpdatePromisedDate(editing.id, date); setEditing(null); }} />}
    <p className="page-footnote">Drag a card, use its "Move to…" button, or the keyboard-accessible button — dragging is never the only way to change stage. Cards past their promised date are flagged at risk.</p>
  </>;
}
