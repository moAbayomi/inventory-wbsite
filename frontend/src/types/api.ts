// Shared response shapes, mirrored from the backend's actual JSON —
// see the "Sweevo Backend Reference" doc for the source of truth on each
// of these. Numeric-looking fields (current_stock, cost_price, ...) are
// typed as `string`, not `number`, on purpose: Postgres numeric columns
// serialize as strings over JSON via Drizzle, so that's what actually
// arrives here. Formatting/parsing them is a Day 2+ concern (MoneyField).

export interface InventoryTotals {
  item_count: number;
  total_stock_value: string;
  total_retail_value: string;
  out_of_stock_count: number;
  potential_profit: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  current_stock: string;
  low_stock_threshold: string;
  cost_price: string;
  selling_price: string;
  currency: string;
  item_type: "FABRIC" | "READY_MADE";
  category_id: string | null;
  description: string | null;
  image_url: string | null;
  design: string | null;
  width_inches: string | null;
  color: string | null;
  dye_lot: string | null;
  size: string | null;
  style_code: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
}

export interface LowStockResponse {
  items: InventoryItem[];
  count: number;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CategoryListResponse {
  categories: Category[];
  count: number;
}

export interface Sale {
  id: string;
  user_id: string;
  total_amount: string;
  total_profit: string;
  customer_name: string | null;
  customer_phone: string | null;
  payment_method: string;
  payment_status: string;
  note: string | null;
  created_at: string;
}

export interface SalesSummary {
  range: { from: string | null; to: string | null };
  totals: {
    revenue: string;
    profit: string;
    sale_count: number;
    average_sale: string;
  };
  by_payment_method: { method: string; total: string; count: number }[];
}

export interface SalesListResponse {
  sales: Sale[];
  count: number;
  page: number;
  limit: number;
}

// One row of a sale's receipt -- what was bought, how much of it, and at
// what price/cost at the time of sale (frozen on the sales_items row itself,
// so this stays accurate even if the item's price changes later).
export interface SaleLineItem {
  id: string;
  item_id: string;
  item_name: string | null;
  item_sku: string | null;
  quantity: string;
  price_per_unit: string;
  cost_per_unit: string;
  subtotal: string;
  profit: string;
}

export interface SalePayment {
  id: string;
  sale_id: string;
  amount: string;
  method: string;
  status: string;
  received_by: string | null;
  reference: string | null;
  note: string | null;
  created_at: string;
}

export interface SaleDetail {
  sale: Sale;
  items: SaleLineItem[];
  payments: SalePayment[];
}

export interface Invite {
  id: string;
  email: string;
  // A string, like every other timestamp in this file -- Drizzle/Postgres
  // sends it over JSON as an ISO string, never an actual Date instance.
  expires_at: string;
}

export interface SalesTimeseriesPoint {
  date: string;
  revenue: string;
  profit: string;
  sale_count: number;
}

export interface SalesTimeseries {
  range: { from: string; to: string };
  bucket: "hour" | "day";
  points: SalesTimeseriesPoint[];
}
