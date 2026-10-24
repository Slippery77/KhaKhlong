import { apiFetch } from '../../../libs/appClient';
import type {
  ApiEnvelope,
  Ingredient,
  IngredientInput,
  InventoryTransaction,
  InventoryTransactionType,
  PaginatedApiEnvelope,
  StockCountBatchResult,
  StockCountInput,
  StockItem,
  UpdateIngredientInput,
} from '../types/inventory.types';

export const inventoryApi = {
  getStock: (token: string | null, includeInactive = false) =>
    apiFetch<ApiEnvelope<StockItem[]>>(
      `/inventory/stock${includeInactive ? '?include_inactive=true' : ''}`,
      token,
    ),

  getIngredients: (token: string | null, includeInactive = false) =>
    apiFetch<ApiEnvelope<Ingredient[]>>(
      `/ingredients${includeInactive ? '?include_inactive=true' : ''}`,
      token,
    ),

  createIngredient: (token: string | null, input: IngredientInput) =>
    apiFetch<ApiEnvelope<Ingredient>>('/ingredients', token, 'POST', input),

  updateIngredient: (
    token: string | null,
    ingredientId: string,
    input: UpdateIngredientInput,
  ) => apiFetch<ApiEnvelope<Ingredient>>(`/ingredients/${ingredientId}`, token, 'PATCH', input),

  deleteIngredient: (token: string | null, ingredientId: string) =>
    apiFetch<ApiEnvelope<never>>(`/ingredients/${ingredientId}`, token, 'DELETE'),

  restock: (token: string | null, ingredientId: string, quantity: number, note?: string) =>
    apiFetch<ApiEnvelope<unknown>>('/inventory/restock', token, 'POST', {
      ingredient_id: ingredientId,
      quantity,
      ...(note?.trim() ? { note: note.trim() } : {}),
    }),

  recordWaste: (
    token: string | null,
    ingredientId: string,
    quantity: number,
    wasteReason: 'expired' | 'spoiled' | 'dropped' | 'other',
    note?: string,
  ) =>
    apiFetch<ApiEnvelope<unknown>>('/inventory/waste', token, 'POST', {
      ingredient_id: ingredientId,
      quantity,
      waste_reason: wasteReason,
      ...(note?.trim() ? { note: note.trim() } : {}),
    }),

  recordStockCount: (
    token: string | null,
    ingredientId: string,
    countedQuantity: number,
    note?: string,
  ) =>
    apiFetch<ApiEnvelope<unknown>>('/inventory/count', token, 'POST', {
      ingredient_id: ingredientId,
      counted_quantity: countedQuantity,
      ...(note?.trim() ? { note: note.trim() } : {}),
    }),

  /** นับสต็อกหลายรายการในคำขอเดียว (จบวัน) — ทั้งชุดสำเร็จหรือไม่บันทึกเลย */
  recordStockCountBatch: (token: string | null, items: StockCountInput[]) =>
    apiFetch<ApiEnvelope<StockCountBatchResult>>('/inventory/count/batch', token, 'POST', {
      items,
    }),

  getTransactions: (
    token: string | null,
    options: { ingredientId?: string; type?: InventoryTransactionType; limit?: number; offset?: number },
  ) => {
    const params = new URLSearchParams();
    if (options.ingredientId) params.set('ingredient_id', options.ingredientId);
    if (options.type) params.set('type', options.type);
    params.set('limit', String(options.limit ?? 20));
    params.set('offset', String(options.offset ?? 0));
    return apiFetch<PaginatedApiEnvelope<InventoryTransaction[]>>(
      `/inventory/transactions?${params.toString()}`,
      token,
    );
  },
};
