import { useState } from 'react';
import { GridComponent, ColumnsDirective, ColumnDirective, Inject as GridInject, Sort } from '@syncfusion/ej2-react-grids';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import type { Dataset, Sku } from '../domain/types.ts';
import { available, stockState } from '../domain/rules.ts';
import { AdjustStockDialog } from '../components/AdjustStockDialog.tsx';

export function Inventory({ dataset, error, onAdjustStock, onRequestReorder }: {
  dataset: Dataset; error: string;
  onAdjustStock: (skuId: string, delta: number, reason: string) => void;
  onRequestReorder: (skuId: string) => void;
}) {
  const [warehouse, setWarehouse] = useState('all');
  const [editing, setEditing] = useState<Sku | null>(null);

  const rows = dataset.skus
    .filter(sku => warehouse === 'all' || sku.warehouseId === warehouse)
    .map(sku => ({
      ...sku,
      warehouseName: dataset.warehouses.find(w => w.id === sku.warehouseId)?.name ?? sku.warehouseId,
      available: available(sku),
      state: stockState(sku)
    }));

  return <>
    <section className="panel">
      <div className="toolbar">
        <div className="field">
          <label htmlFor="inventory-warehouse">Warehouse</label>
          <DropDownListComponent id="inventory-warehouse" value={warehouse}
            dataSource={[{ id: 'all', name: 'All warehouses' }, ...dataset.warehouses.map(({ id, name }) => ({ id, name }))]}
            fields={{ text: 'name', value: 'id' }} change={args => setWarehouse(String(args.value ?? 'all'))} />
        </div>
        <span className="toolbar-note">{rows.length} SKUs</span>
      </div>
      {error && <div className="notice error" role="alert" style={{ margin: '0 24px' }}>{error}</div>}
      <div className="grid-scroll">
        <GridComponent id="inventory-grid" dataSource={rows} allowSorting enableHtmlSanitizer rowHeight={56} width="100%" gridLines="Horizontal" aria-label="Inventory">
          <ColumnsDirective>
            <ColumnDirective field="id" headerText="SKU" width="220" template={(data: Sku & { warehouseName: string }) =>
              <div className="sku-cell"><span className="sku-title">{data.name}</span><span className="sku-subtitle">{data.id} · {data.category}</span></div>} />
            <ColumnDirective field="warehouseName" headerText="Warehouse" width="150" />
            <ColumnDirective field="onHand" headerText="On Hand" textAlign="Right" width="90" />
            <ColumnDirective field="reserved" headerText="Reserved" textAlign="Right" width="90" />
            <ColumnDirective field="available" headerText="Available" textAlign="Right" width="90" />
            <ColumnDirective field="reorderPoint" headerText="Reorder At" textAlign="Right" width="100" />
            <ColumnDirective field="state" headerText="State" width="120" template={(data: Sku & { state: string }) =>
              <span className="status-badge" data-status={data.state}>{data.state}</span>} />
            <ColumnDirective headerText="Actions" width="180" template={(data: Sku) =>
              <div className="grid-actions">
                <ButtonComponent cssClass="action-button" onClick={() => setEditing(data)} aria-label={`Adjust stock for ${data.name}`}>Adjust</ButtonComponent>
                <ButtonComponent cssClass="action-button" disabled={!!data.pendingReorder} onClick={() => onRequestReorder(data.id)} aria-label={`Reorder ${data.name}`}>
                  {data.pendingReorder ? 'Reorder pending' : 'Reorder'}
                </ButtonComponent>
              </div>} />
          </ColumnsDirective>
          <GridInject services={[Sort]} />
        </GridComponent>
      </div>
    </section>
    {editing && <AdjustStockDialog sku={editing} onClose={() => setEditing(null)}
      onSubmit={(delta, reason) => { onAdjustStock(editing.id, delta, reason); setEditing(null); }} />}
    <p className="page-footnote">Stock adjustments and reorder requests are session/browser-local — no shared database is written.</p>
  </>;
}
