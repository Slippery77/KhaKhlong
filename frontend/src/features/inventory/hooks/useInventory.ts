import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { inventoryApi } from '../api/inventory.api';
import type {
  Ingredient,
  InventoryItem,
  NewIngredientInput,
  UpdateIngredientInput,
} from '../types/inventory.types';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function useInventory() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const [stockResponse, ingredientsResponse] = await Promise.all([
          inventoryApi.getStock(accessToken, true),
          inventoryApi.getIngredients(accessToken, true),
        ]);
        const ingredientById = new Map(
          ingredientsResponse.data.map((ingredient) => [ingredient.ingredient_id, ingredient]),
        );
        setItems(
          stockResponse.data.flatMap((stock) => {
            const ingredient = ingredientById.get(stock.ingredient_id);
            return ingredient
              ? [{ ...stock, ...ingredient }]
              : [];
          }),
        );
        setIngredients(ingredientsResponse.data);
      } catch (requestError) {
        setError(getErrorMessage(requestError, 'ไม่สามารถโหลดข้อมูลสต็อกได้'));
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    // Fetching after mount necessarily updates local request state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const runMutation = async (work: () => Promise<void>, fallback: string) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await work();
      await load(true);
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError, fallback));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const createIngredient = (input: NewIngredientInput) =>
    runMutation(async () => {
      const { initial_quantity: initialQuantity, ...ingredient } = input;
      const response = await inventoryApi.createIngredient(accessToken, ingredient);
      if (initialQuantity > 0) {
        await inventoryApi.restock(accessToken, response.data.ingredient_id, initialQuantity);
      }
    }, 'ไม่สามารถเพิ่มวัตถุดิบได้');

  const updateIngredient = (ingredientId: string, input: UpdateIngredientInput) =>
    runMutation(
      () => inventoryApi.updateIngredient(accessToken, ingredientId, input).then(() => undefined),
      'ไม่สามารถแก้ไขวัตถุดิบได้',
    );

  const deleteIngredient = (ingredientId: string) =>
    runMutation(
      () => inventoryApi.deleteIngredient(accessToken, ingredientId).then(() => undefined),
      'ไม่สามารถลบวัตถุดิบได้',
    );

  const restock = (ingredientId: string, quantity: number, note?: string) =>
    runMutation(
      () => inventoryApi.restock(accessToken, ingredientId, quantity, note).then(() => undefined),
      'ไม่สามารถรับของเข้าสต็อกได้',
    );

  const recordWaste = (
    ingredientId: string,
    quantity: number,
    reason: 'expired' | 'spoiled' | 'dropped' | 'other',
    note?: string,
  ) =>
    runMutation(
      () =>
        inventoryApi
          .recordWaste(accessToken, ingredientId, quantity, reason, note)
          .then(() => undefined),
      'ไม่สามารถบันทึกของเสียได้',
    );

  const recordStockCount = (ingredientId: string, countedQuantity: number, note?: string) =>
    runMutation(
      () =>
        inventoryApi
          .recordStockCount(accessToken, ingredientId, countedQuantity, note)
          .then(() => undefined),
      'ไม่สามารถปรับยอดสต็อกได้',
    );

  return {
    items,
    ingredients,
    isLoading,
    isSubmitting,
    error,
    reload: () => load(true),
    createIngredient,
    updateIngredient,
    deleteIngredient,
    restock,
    recordWaste,
    recordStockCount,
  };
}
