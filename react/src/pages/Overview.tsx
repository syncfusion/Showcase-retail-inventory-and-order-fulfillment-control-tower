import { CheckCircle2, TimerReset, AlertTriangle, PackageX } from 'lucide-react';
import { ChartComponent, SeriesCollectionDirective, SeriesDirective, Inject, ColumnSeries, Category, Tooltip, DataLabel } from '@syncfusion/ej2-react-charts';
import { GridComponent, ColumnsDirective, ColumnDirective } from '@syncfusion/ej2-react-grids';
import type { Dataset, Kpis } from '../domain/types.ts';
import { isAtRisk, stockState } from '../domain/rules.ts';

interface AtRiskRow { id: string; kind: 'Order' | 'SKU'; reference: string; detail: string; }

export function Overview({ dataset, kpis, theme, onNavigate }: { dataset: Dataset; kpis: Kpis; theme: 'light' | 'dark'; onNavigate: (page: string) => void }) {
  const atRiskOrders = dataset.orders.filter(order => isAtRisk(order, dataset.scenarioNow));
  const stockoutSkus = dataset.skus.filter(sku => stockState(sku) === 'OutOfStock');
  const chart = ['InStock', 'Low', 'Reorder', 'OutOfStock'].map(state => ({
    label: state, count: dataset.skus.filter(sku => stockState(sku) === state).length
  }));
  const atRiskRows: AtRiskRow[] = [
    ...atRiskOrders.slice(0, 4).map(order => ({ id: `order-${order.id}`, kind: 'Order' as const, reference: order.id, detail: `${order.customer} — ${order.stage}` })),
    ...stockoutSkus.slice(0, 4).map(sku => ({ id: `sku-${sku.id}`, kind: 'SKU' as const, reference: sku.id, detail: `${sku.name} — stockout` }))
  ];

  function activate(event: React.KeyboardEvent<HTMLElement>, page: string) {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onNavigate(page); }
  }

  return <>
    <div className="metrics">
      <section className="e-card metric">
        <div className="e-card-content">
          <span className="metric-label">Inventory Accuracy</span>
          <span className="metric-icon" aria-hidden="true"><CheckCircle2 size={17} /></span>
          <span className="metric-number">{kpis.inventoryAccuracy}%</span>
          <span className="metric-note">Session-derived estimate, not a cycle-count audit</span>
        </div>
      </section>
      <section className="e-card metric">
        <div className="e-card-content">
          <span className="metric-label">On-Time Fulfillment Rate</span>
          <span className="metric-icon" aria-hidden="true"><TimerReset size={17} /></span>
          <span className="metric-number">{kpis.onTimeRate === null ? '—' : `${kpis.onTimeRate}%`}</span>
          <span className="metric-note">{kpis.onTimeRate === null ? 'No orders delivered yet this session' : 'Of orders delivered this session'}</span>
        </div>
      </section>
      <section className="e-card metric metric-interactive" role="link" tabIndex={0}
        aria-label={`At-risk orders: ${kpis.atRiskOrderCount}. View Order Fulfillment`}
        onClick={() => onNavigate('fulfillment')} onKeyDown={event => activate(event, 'fulfillment')}>
        <div className="e-card-content">
          <span className="metric-label">At-Risk Orders</span>
          <span className="metric-icon" data-tone="danger" aria-hidden="true"><AlertTriangle size={17} /></span>
          <span className="metric-number">{kpis.atRiskOrderCount}</span>
          <span className="metric-note">Past promised date, not yet delivered</span>
        </div>
      </section>
      <section className="e-card metric metric-interactive" role="link" tabIndex={0}
        aria-label={`Stockout count: ${kpis.stockoutCount}. View Inventory`}
        onClick={() => onNavigate('inventory')} onKeyDown={event => activate(event, 'inventory')}>
        <div className="e-card-content">
          <span className="metric-label">Stockout Count</span>
          <span className="metric-icon" data-tone="danger" aria-hidden="true"><PackageX size={17} /></span>
          <span className="metric-number">{kpis.stockoutCount}</span>
          <span className="metric-note">SKUs with zero available units</span>
        </div>
      </section>
    </div>

    <div className="overview-grid">
      <section className="panel" aria-labelledby="stock-state-heading">
        <div className="panel-heading"><div><h2 id="stock-state-heading">Stock state breakdown</h2><p>All {dataset.skus.length} SKUs · current session</p></div></div>
        <div className="chart-wrap">
          <ChartComponent key={theme} id="stock-state-chart" height="380px" theme={theme === 'dark' ? 'Tailwind3Dark' : 'Tailwind3'} background="transparent"
            primaryXAxis={{ valueType: 'Category', majorGridLines: { width: 0 } }}
            primaryYAxis={{ minimum: 0, interval: 2, title: 'SKUs', lineStyle: { width: 0 }, majorTickLines: { width: 0 } }}
            chartArea={{ border: { width: 0 } }} tooltip={{ enable: true }} legendSettings={{ visible: false }}>
            <Inject services={[ColumnSeries, Category, Tooltip, DataLabel]} />
            <SeriesCollectionDirective>
              <SeriesDirective dataSource={chart} type="Column" xName="label" yName="count" name="SKUs" fill="var(--chart-series-primary)"
                cornerRadius={{ topLeft: 3, topRight: 3 }} marker={{ dataLabel: { visible: true, position: 'Top' } }} animation={{ enable: false }} />
            </SeriesCollectionDirective>
          </ChartComponent>
        </div>
      </section>
      <section className="panel" aria-labelledby="at-risk-heading">
        <div className="panel-heading"><div><h2 id="at-risk-heading">At risk today</h2><p>{atRiskOrders.length} orders, {stockoutSkus.length} SKUs</p></div></div>
        <div className="grid-scroll">
          <GridComponent id="at-risk-grid" dataSource={atRiskRows} enableHtmlSanitizer rowHeight={48} width="100%" gridLines="Horizontal"
            aria-label="At risk today" emptyRecordTemplate={() => <p className="muted" style={{ padding: 24 }}>Nothing at risk in the current session.</p>}>
            <ColumnsDirective>
              <ColumnDirective field="kind" headerText="Type" width="80" template={(data: AtRiskRow) =>
                <span className="status-badge" data-status={data.kind === 'Order' ? 'Reorder' : 'OutOfStock'}>{data.kind}</span>} />
              <ColumnDirective field="reference" headerText="Reference" width="110" />
              <ColumnDirective field="detail" headerText="Detail" width="180" />
            </ColumnsDirective>
          </GridComponent>
        </div>
      </section>
    </div>
    <p className="page-footnote">Metrics use the complete current session dataset, not a filtered page. All names, stock, and orders are synthetic.</p>
  </>;
}
