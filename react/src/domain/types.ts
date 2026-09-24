export type Category = 'Electronics' | 'Home Goods' | 'Apparel' | 'Grocery' | 'Office Supplies';
export type StockState = 'InStock' | 'Low' | 'Reorder' | 'OutOfStock';
export type Stage = 'Received' | 'Picking' | 'Packed' | 'Shipped' | 'Delivered';
export type Priority = 'Standard' | 'Expedited';

export interface Warehouse {
  id: string;
  name: string;
  region: 'Northeast' | 'Southeast' | 'Midwest' | 'West';
}

export interface Sku {
  id: string;
  name: string;
  category: Category;
  warehouseId: string;
  unitCost: number;
  onHand: number;
  reserved: number;
  reorderPoint: number;
  reorderQty: number;
  lastRestockedAt: string;
  pendingReorder?: boolean;
}

export interface OrderItem { skuId: string; qty: number; }

export interface Order {
  id: string;
  customer: string;
  items: OrderItem[];
  stage: Stage;
  priority: Priority;
  promisedDeliveryDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Kpis {
  inventoryAccuracy: number;
  onTimeRate: number | null;
  atRiskOrderCount: number;
  stockoutCount: number;
}

export interface Dataset {
  fixtureVersion: string;
  scenarioNow: string;
  warehouses: Warehouse[];
  skus: Sku[];
  orders: Order[];
}

export const STAGE_ORDER: Stage[] = ['Received', 'Picking', 'Packed', 'Shipped', 'Delivered'];
