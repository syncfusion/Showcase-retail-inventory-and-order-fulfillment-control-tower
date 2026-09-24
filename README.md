# Retail Inventory & Order Fulfillment Control Tower

A single-page **control tower** for monitoring retail inventory health and moving
orders through a fulfillment pipeline — built with **React 19**, **Vite 8**,
**TypeScript**, and **Syncfusion EJ2 React** components on **Tailwind CSS 4**.
All data is synthetic and lives entirely in the browser; there is no backend
API or database.

The deployed app serves from a fixed base path (`/retail-inventory-control/react/`)
and the same build runs unchanged on Windows App Service (IIS, `public/web.config`)
and Linux App Service (`server.mjs` Node host).

---

## Highlights

- **Four workspaces**, hash-routed from the sidebar:
  | Page | Route | What it does |
  |------|-------|---------------|
  | Overview | `/overview` | KPI cards (inventory accuracy, on-time rate, at-risk orders, stockouts), a **Syncfusion Chart** stock-state column chart, and an at-risk grid with deep-links into Fulfillment/Inventory. |
  | Inventory | `/inventory` | **Syncfusion Grid** of SKUs with warehouse filter, stock-state badges, per-row **Adjust stock** and **Reorder** actions, and a **Dialog**-backed adjust form that is validated against reserved quantity. |
  | Order Fulfillment | `/fulfillment` | **Syncfusion Kanban** board (Received → Picking → Packed → Shipped → Delivered) with drag-and-drop that is validated server-style (single-step advances only), per-card **Edit promised date** and **Move to next stage** actions, and at-risk highlighting. |
  | AI Assistant | `/assistant` | **Syncfusion AIAssistView** that answers natural-language questions about the *live session* data (at-risk orders, reorder needs) via a swappable `AiProviderPort` — a deterministic sample provider, no live model or client-exposed key. |
- **Light/dark theme** toggle that loads the matching **Syncfusion Tailwind 3** theme CSS at runtime and persists the choice to `localStorage`.
- **Browser-local persistence**: changes survive reloads in the same browser (customer/local profile); public visitors get session-only behavior by design. A **Reset demo** action restores the original fixture.
- **Pure domain layer** (`src/domain/`) with no framework or Syncfusion imports — unit-tested with `node --test`.
- **Accessible**: skip link, focusable headings, ARIA-labelled controls, keyboard-activatable metric cards, and HTML-sanitizing grids.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| UI framework | React 19, TypeScript (strict), Vite 8 |
| Components | Syncfusion EJ2 React 34.2 — Grid, Kanban, Chart, AIAssistView, DropDownList, Dialog, Button |
| Styling | Tailwind CSS 4 via `@tailwindcss/vite`, plus Syncfusion Tailwind 3 light/dark theme CSS swapped at runtime |
| Icons | `lucide-react` 1.47 |
| Data | Synthetic JSON fixture (`src/fixtures/dataset.json`) — 4 warehouses, 40 SKUs across 5 categories, 30 orders |
| State | Single `useDataset` hook with reducer-like actions over an immutable `Dataset` |
| Host | `server.mjs` Node static host (Linux App Service) / IIS rewrite (Windows App Service) — same `dist/` build |

---

## Project structure

```
react/
├── index.html              # SPA shell (title, root, entry script)
├── package.json            # Vite/TS tooling + Syncfusion + React deps
├── server.mjs              # Production static host (SPA fallback, /healthz, asset caching)
├── vite.config.ts          # Fixed base /retail-inventory-control/react/, Tailwind plugin
├── tsconfig.json           # Strict TS, Bundler resolution, allowImportingTsExtensions
├── public/
│   └── web.config          # IIS rewrite rules for the prefixed mount path
└── src/
    ├── main.tsx            # Entry: registers Syncfusion license (if env key set), applies theme, mounts <App>
    ├── App.tsx             # Shell: sidebar nav, topbar, routing, theme toggle, reset dialog
    ├── basePath.ts         # Resolves whether the page is under the public mount path
    ├── theme.ts            # Loads light/dark Syncfusion theme CSS, persists to localStorage
    ├── styles.css          # Global styles (design tokens, layout, components)
    ├── adapters/
    │   ├── aiProviderPort.ts   # Swappable AI interface (answer(question, dataset, signal))
    │   ├── sampleAiProvider.ts # Deterministic, dataset-grounded sample implementation
    │   └── sessionStore.ts     # loadData / persist / reset against localStorage + fixture
    ├── components/
    │   ├── AdjustStockDialog.tsx    # Dialog form for on-hand adjustments
    │   └── PromisedDateDialog.tsx   # Dialog form for editing a promised delivery date
    ├── domain/
    │   ├── types.ts        # Dataset, Sku, Order, Stage, Kpis, etc. (+ STAGE_ORDER)
    │   ├── rules.ts        # Pure functions: available, stockState, isAtRisk, canAdvanceStage, computeKpis, validate*
    │   └── rules.test.ts    # node:test unit tests for the domain rules
    ├── fixtures/
    │   └── dataset.json     # Synthetic dataset (fixtureVersion 2026.09.22-3, scenarioNow 2026-09-22T09:00Z)
    ├── pages/
    │   ├── Overview.tsx     # KPI cards, Chart column chart, at-risk grid
    │   ├── Inventory.tsx    # Filterable Grid + adjust/reorder actions
    │   ├── Fulfillment.tsx  # Kanban board with drag-stop validation
    │   └── Assistant.tsx    # AIAssistView wired to the sample provider
    └── state/
        └── useDataset.ts    # The one state hook: load/persist + all domain actions
```

---

## Domain model

The data contract (`src/domain/types.ts`) is the source of truth every UI reads from:

- **`Warehouse`** — id, name, region (Northeast / Southeast / Midwest / West).
- **`Sku`** — id, name, category (`Electronics | Home Goods | Apparel | Grocery | Office Supplies`),
  warehouseId, `unitCost`, `onHand`, `reserved`, `reorderPoint`, `reorderQty`, `lastRestockedAt`, `pendingReorder`.
- **`Order`** — id, customer, items (`{ skuId, qty }[]`), `stage` (`Received → Picking → Packed → Shipped → Delivered`),
  `priority` (`Standard | Expedited`), `promisedDeliveryDate`, `createdAt`, `updatedAt`.
- **`Kpis`** — derived by `computeKpis`: `inventoryAccuracy`, `onTimeRate` (nullable), `atRiskOrderCount`, `stockoutCount`.
- **`Dataset`** — `{ fixtureVersion, scenarioNow, warehouses[], skus[], orders[] }`. The `fixtureVersion`
  is used to invalidate stale localStorage overlays after a fixture change.

### Key business rules (`src/domain/rules.ts`)

- `available(sku) = onHand - reserved`
- `stockState(sku)`: `OutOfStock` (≤0) → `Reorder` (≤ reorderPoint) → `Low` (≤ 2× reorderPoint) → `InStock`.
- `isAtRisk(order, now)`: not delivered **and** promised date is before `scenarioNow`.
- `canAdvanceStage(from, to)`: only the very next stage in `STAGE_ORDER`, never skipping or leaving `Delivered`.
- `validateAdjustStock`: cannot reduce on-hand below `reserved`, cannot go negative.
- `validateReorder`: only allowed when state is `Reorder` or `OutOfStock`.

---

## Running it

Requires Node ≥ 24 (see `engines`).

```bash
cd react

# install (your project's preferred manager)
npm install

# local dev
npm run dev        # Vite dev server on http://127.0.0.1:5174

# production build + serve
npm run build      # tsc --noEmit && vite build → dist/
npm start          # node server.mjs, serves dist/ on PORT (default 8080)

# checks
npm run typecheck  # tsc --noEmit
npm test           # node --test src/domain/*.test.ts
```

The `%VITE_SYNCFUSION_LICENSE_KEY%` environment variable, if set, registers the
Syncfusion license at startup (`src/main.tsx`); otherwise the components run
under their default licensing.

---

## Deployment

- **Base path**: the Vite build is configured with `base: '/retail-inventory-control/react/'`
  so asset URLs are absolute under the mount prefix. `src/basePath.ts` re-derives the
  prefix at runtime so SPA routing and asset references work both at the prefixed URL
  and when the build is served directly from the App Service root.
- **Windows App Service (IIS)**: `public/web.config` rewrites `^retail-inventory-control/react/(.+)$`
  to the underlying file, and routes prefixed SPA paths and root paths to `index.html`.
- **Linux App Service / Node**: `server.mjs` serves `dist/` with SPA fallback,
  a `/healthz` liveness endpoint, immutable caching for content-hashed `/assets/*`,
  and `no-store` for `index.html` so new releases appear immediately.
- **No API, no database**: every change is browser-local by design; the host process
  only serves static files.

---

## Testing

`npm test` runs the domain rules suite with Node's built-in test runner:

```bash
node --test src/domain/*.test.ts
```

Coverage includes stock-state derivation, at-risk detection, stage-advance
validation, KPI computation, and the adjust/reorder validators — the exact rules
the UI relies on, kept framework-free so they can be regression-tested without a
browser.

---

## Notes & conventions

- **Domain/UI boundary**: `src/domain/` imports nothing from React or Syncfusion,
  keeping business rules pure and testable. UI and state call into the domain;
  the domain never calls out to them.
- **AI is a swappable port**: `AiProviderPort` is the only integration point. The
  sample provider is deterministic and grounded in the live session dataset — a
  real deployment swaps it for Azure OpenAI / Gemini etc., credentials held
  server-side, with no UI change required.
- **Scenario clock**: the dataset pins `scenarioNow` to `2026-09-22T09:00Z`
  and the topbar displays a fixed "Demo time" so risk calculations are reproducible.

