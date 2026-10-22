export interface ApiEnvelope<T> {
  status: 'success';
  data: T;
}

export interface Ingredient {
  ingredient_id: string;
  name: string;
  stock_unit: string;
  purchase_unit: string | null;
  purchase_to_stock_ratio: number | null;
  low_stock_threshold: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockItem {
  ingredient_id: string;
  name: string;
  stock_unit: string;
  low_stock_threshold: number | null;
  current_stock: number;
  is_low: boolean;
}

export interface IngredientInput {
  name: string;
  stock_unit: string;
  purchase_unit?: string;
  purchase_to_stock_ratio?: number;
  low_stock_threshold?: number;
}

export interface NewIngredientInput extends IngredientInput {
  initial_quantity: number;
}

export interface UpdateIngredientInput extends Partial<IngredientInput> {
  is_active?: boolean;
}

export interface InventoryItem extends StockItem {
  purchase_unit: string | null;
  purchase_to_stock_ratio: number | null;
  is_active: boolean;
}

export type InventoryTransactionType = 'restock' | 'adjustment' | 'waste';

export interface InventoryTransaction {
  transaction_id: string;
  ingredient_id: string;
  ingredient_name?: string;
  stock_unit?: string;
  type: InventoryTransactionType;
  quantity_change: number;
  counted_quantity: number | null;
  waste_reason: 'expired' | 'spoiled' | 'dropped' | 'other' | null;
  note: string | null;
  created_by: string;
  created_at: string;
}

export interface PaginatedApiEnvelope<T> extends ApiEnvelope<T> {
  pagination: { total: number; limit: number; offset: number };
}

/** รายการนับสต็อกหนึ่งแถวสำหรับ POST /inventory/count/batch */
export interface StockCountInput {
  ingredient_id: string;
  counted_quantity: number;
  note?: string;
}

export interface StockCountResultItem {
  ingredient_id: string;
  ingredient_name: string;
  stock_unit: string;
  counted_quantity: number;
  /** counted_quantity - ยอดระบบ (ลบ = ใช้ไป/ขาด, บวก = นับได้เกิน) */
  delta: number;
}

export interface StockCountBatchResult {
  items: StockCountResultItem[];
  adjusted_count: number;
  unchanged_count: number;
}
