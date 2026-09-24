import { useEffect, useState, type MouseEvent } from 'react';
import { Boxes, LayoutDashboard, Package, Columns3, Sparkles, Moon, Sun, RotateCcw, Menu } from 'lucide-react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { DialogComponent } from '@syncfusion/ej2-react-popups';
import { useDataset } from './state/useDataset.ts';
import { applyTheme, type Theme } from './theme.ts';
import { getPublicBasePath } from './basePath.ts';
import { Overview } from './pages/Overview.tsx';
import { Inventory } from './pages/Inventory.tsx';
import { Fulfillment } from './pages/Fulfillment.tsx';
import { Assistant } from './pages/Assistant.tsx';

const routes = [
  { id: 'overview', label: 'Overview', title: 'Control tower overview', description: 'Stock and fulfillment health, in one clear view.', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory', title: 'Inventory', description: 'Stock levels, reorder points, and adjustments.', icon: Package },
  { id: 'fulfillment', label: 'Order Fulfillment', title: 'Order fulfillment', description: 'Move orders through the fulfillment pipeline.', icon: Columns3 },
  { id: 'assistant', label: 'AI Assistant', title: 'AI assistant', description: 'Sample-data assistance for restock and fulfillment risk.', icon: Sparkles },
] as const;
const base = getPublicBasePath();
const href = (id: string) => `${base}/${id}`;
const readRoute = () => location.pathname.slice(base.length).replace(/^\//, '').replace(/\/$/, '') || 'overview';

export function App({ initialTheme }: { initialTheme: Theme }) {
  const [route, setRoute] = useState(readRoute);
  const [theme, setTheme] = useState(initialTheme);
  const [themeBusy, setThemeBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const data = useDataset();
  const current = routes.find(item => item.id === route);

  useEffect(() => {
    const pop = () => setRoute(readRoute());
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);

  function navigate(id: string, event?: MouseEvent<HTMLAnchorElement>) {
    if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
    event?.preventDefault();
    history.pushState({}, '', href(id));
    setRoute(id);
    setMenuOpen(false);
    requestAnimationFrame(() => document.getElementById('main-heading')?.focus());
  }

  async function toggleTheme() {
    setThemeBusy(true);
    try { const next = theme === 'light' ? 'dark' : 'light'; await applyTheme(next); setTheme(next); }
    finally { setThemeBusy(false); }
  }

  const navigation = <nav className="navigation" aria-label="Main navigation">
    {routes.map(({ id, label, icon: Icon }) =>
      <a key={id} href={href(id)} aria-current={route === id ? 'page' : undefined} onClick={event => navigate(id, event)}>
        <Icon size={18} aria-hidden="true" />{label}
      </a>)}
  </nav>;

  return <>
    <a className="skip-link" href="#main-content" onClick={() => requestAnimationFrame(() => document.getElementById('main-heading')?.focus())}>Skip to content</a>
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-icon"><Boxes size={24} /></span><div><strong>CONTROL TOWER</strong><small>Retail inventory workspace</small></div></div>
        <div><div className="nav-label">Workspace</div>{navigation}</div>
        <div className="sidebar-footer"><strong>Built with Syncfusion</strong><p>React · JSON data</p><span className="prototype-tag">SYNTHETIC DATA</span></div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <ButtonComponent cssClass="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={18} /></ButtonComponent>
            <span className="muted">Workspace / <strong>{current?.label ?? 'Not found'}</strong></span>
          </div>
          <div className="topbar-actions">
            <div className="demo-clock"><strong>Demo time · Sep 22, 2026</strong>9:00 AM · America/New_York</div>
            <span className="profile-pill">Browser-local data</span>
            <ButtonComponent cssClass="icon-button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} disabled={themeBusy} onClick={toggleTheme}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</ButtonComponent>
            <ButtonComponent cssClass="icon-button" aria-label="Reset sample data" onClick={() => setResetOpen(true)}><RotateCcw size={17} /></ButtonComponent>
          </div>
        </header>
        <main id="main-content" className="page-content">
          <div className="page-heading"><div><div className="eyebrow">Retail Inventory &amp; Order Fulfillment Control Tower</div><h1 id="main-heading" tabIndex={-1}>{current?.title ?? 'Page not found'}</h1><p>{current?.description ?? 'Choose a page from the workspace navigation.'}</p></div></div>
          {data.error && <div className="notice error" role="alert">{data.error}</div>}
          {route === 'overview' && <Overview dataset={data.dataset} kpis={data.kpis} theme={theme} onNavigate={navigate} />}
          {route === 'inventory' && <Inventory dataset={data.dataset} error={data.error} onAdjustStock={data.adjustStock} onRequestReorder={data.requestReorder} />}
          {route === 'fulfillment' && <Fulfillment dataset={data.dataset} error={data.error} onMoveStage={data.moveOrderStage} onUpdatePromisedDate={data.updatePromisedDate} />}
          {route === 'assistant' && <Assistant dataset={data.dataset} />}
          <p className="page-footnote">Public visitors: changes stay in this tab only. Customer preview: adjustments persist in this browser only, not a shared database. Demo clock: September 22, 2026, 9:00 AM Eastern.</p>
        </main>
      </div>
    </div>
    {menuOpen && <DialogComponent header="Workspace navigation" visible isModal showCloseIcon width="300px" target="#root" close={() => setMenuOpen(false)} animationSettings={{ effect: 'None' }}>{navigation}</DialogComponent>}
    {resetOpen && <DialogComponent header="Reset sample data?" visible isModal showCloseIcon width="440px" target="#root" close={() => setResetOpen(false)} animationSettings={{ effect: 'None' }}>
      <p>This replaces your browser-local changes with the original synthetic dataset. It does not affect any database.</p>
      <div className="form-actions">
        <ButtonComponent cssClass="action-button" onClick={() => setResetOpen(false)}>Keep changes</ButtonComponent>
        <ButtonComponent cssClass="primary-button" onClick={() => { data.reset(); setResetOpen(false); }}>Reset demo</ButtonComponent>
      </div>
    </DialogComponent>}
  </>;
}
