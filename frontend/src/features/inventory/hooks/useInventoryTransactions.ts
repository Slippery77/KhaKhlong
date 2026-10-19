import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { inventoryApi } from '../api/inventory.api';
import type { InventoryTransaction, InventoryTransactionType } from '../types/inventory.types';

export function useInventoryTransactions() {
  const { accessToken } = useAuth();
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [type, setType] = useState<InventoryTransactionType | undefined>();
  const [ingredientId, setIngredientId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await inventoryApi.getTransactions(accessToken, {
        ingredientId,
        type,
        limit,
        offset,
      });
      setTransactions(response.data);
      setTotal(response.pagination.total);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'ไม่สามารถโหลดประวัติสต็อกได้');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, ingredientId, offset, type]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const selectType = (value: InventoryTransactionType | undefined) => {
    setOffset(0);
    setType(value);
  };
  const selectIngredient = (value: string | undefined) => {
    setOffset(0);
    setIngredientId(value);
  };

  return {
    transactions,
    total,
    offset,
    limit,
    type,
    ingredientId,
    isLoading,
    error,
    reload: load,
    setType: selectType,
    setIngredientId: selectIngredient,
    previousPage: () => setOffset((value) => Math.max(0, value - limit)),
    nextPage: () => setOffset((value) => Math.min(value + limit, Math.max(0, total - 1))),
  };
}
