import type { QueryResultRow } from 'pg';

type NumericValue = number | string;

export interface IngredientRow extends QueryResultRow {
  ingredient_id: string;
  tenant_id: string;
  name: string;
  stock_unit: string;
  purchase_unit: string | null;
  purchase_to_stock_ratio: NumericValue | null;
  low_stock_threshold: NumericValue | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface StockItemRow extends QueryResultRow {
  ingredient_id: string;
  name: string;
  stock_unit: string;
  low_stock_threshold: NumericValue | null;
  current_stock: NumericValue;
  is_low: boolean;
}

export interface InventoryTransactionRow extends QueryResultRow {
  transaction_id: string;
  ingredient_id: string;
  ingredient_name?: string;
  stock_unit?: string;
  type: 'restock' | 'adjustment' | 'waste';
  quantity_change: NumericValue;
  counted_quantity: NumericValue | null;
  waste_reason: string | null;
  note: string | null;
  created_by: string;
  created_at: Date;
  business_date?: string;
}

export interface StockCountResultRow extends QueryResultRow {
  delta: NumericValue;
}

export interface TotalRow extends QueryResultRow {
  total: number;
}
