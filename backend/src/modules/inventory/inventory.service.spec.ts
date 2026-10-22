import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InventoryRepository } from './inventory.repository';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let repository: jest.Mocked<InventoryRepository>;

  const ingredient = {
    ingredient_id: '550e8400-e29b-41d4-a716-446655440000',
    tenant_id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'เนื้อหมูสันนอก',
    stock_unit: 'กรัม',
    purchase_unit: null,
    purchase_to_stock_ratio: null,
    low_stock_threshold: null,
    is_active: true,
    created_at: new Date('2026-10-19T00:00:00.000Z'),
    updated_at: new Date('2026-10-19T00:00:00.000Z'),
  };

  beforeEach(() => {
    repository = {
      createIngredient: jest.fn(),
      findAllIngredients: jest.fn(),
      findIngredientById: jest.fn(),
      updateIngredient: jest.fn(),
      softDeleteIngredient: jest.fn(),
      getStockList: jest.fn(),
      recordRestock: jest.fn(),
      recordWaste: jest.fn(),
      recordStockCount: jest.fn(),
      findTransactions: jest.fn(),
      countTransactions: jest.fn(),
    } as unknown as jest.Mocked<InventoryRepository>;
    service = new InventoryService(repository);
  });

  it('returns a mapped ingredient after creation', async () => {
    repository.createIngredient.mockResolvedValue(ingredient);

    await expect(
      service.createIngredient({
        name: ingredient.name,
        stock_unit: ingredient.stock_unit,
      }),
    ).resolves.toMatchObject({
      status: 'success',
      data: { ingredient_id: ingredient.ingredient_id, name: ingredient.name },
    });
  });

  it('maps a duplicate ingredient name to HTTP 409', async () => {
    repository.createIngredient.mockRejectedValue({ code: '23505' });

    await expect(
      service.createIngredient({
        name: ingredient.name,
        stock_unit: ingredient.stock_unit,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns 404 when an atomic update affects no ingredient', async () => {
    repository.updateIngredient.mockResolvedValue(null);

    await expect(
      service.updateIngredient(ingredient.ingredient_id, { name: 'หมูบด' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not create a restock transaction for an inactive ingredient', async () => {
    repository.findIngredientById.mockResolvedValue({
      ...ingredient,
      is_active: false,
    });

    await expect(
      service.restock(
        { ingredient_id: ingredient.ingredient_id, quantity: 1000 },
        'user-id',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.recordRestock.mock.calls).toHaveLength(0);
  });

  it('uses the database stock-count function and reports the returned delta', async () => {
    repository.findIngredientById.mockResolvedValue(ingredient);
    repository.recordStockCount.mockResolvedValue({ delta: '125.5' });

    await expect(
      service.recordStockCount(
        { ingredient_id: ingredient.ingredient_id, counted_quantity: 125.5 },
        'user-id',
      ),
    ).resolves.toMatchObject({
      status: 'success',
      data: { delta: 125.5, counted_quantity: 125.5 },
    });
  });

  it('counts multiple ingredients in one batch and separates adjusted from unchanged', async () => {
    const egg = {
      ...ingredient,
      ingredient_id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'ไข่ไก่',
      stock_unit: 'ฟอง',
    };
    repository.findIngredientById
      .mockResolvedValueOnce(ingredient)
      .mockResolvedValueOnce(egg);
    repository.recordStockCount
      .mockResolvedValueOnce({ delta: '-200' })
      .mockResolvedValueOnce({ delta: '0' });

    const result = await service.recordStockCountBatch(
      {
        items: [
          { ingredient_id: ingredient.ingredient_id, counted_quantity: 800 },
          { ingredient_id: egg.ingredient_id, counted_quantity: 30 },
        ],
      },
      'user-id',
    );

    expect(result).toMatchObject({
      status: 'success',
      data: { adjusted_count: 1, unchanged_count: 1 },
    });
    expect(result.data.items).toEqual([
      {
        ingredient_id: ingredient.ingredient_id,
        ingredient_name: ingredient.name,
        stock_unit: ingredient.stock_unit,
        counted_quantity: 800,
        delta: -200,
      },
      {
        ingredient_id: egg.ingredient_id,
        ingredient_name: egg.name,
        stock_unit: egg.stock_unit,
        counted_quantity: 30,
        delta: 0,
      },
    ]);
  });

  it('rejects duplicate ingredients in the same batch before adjusting anything', async () => {
    await expect(
      service.recordStockCountBatch({
        items: [
          { ingredient_id: ingredient.ingredient_id, counted_quantity: 10 },
          { ingredient_id: ingredient.ingredient_id, counted_quantity: 20 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.recordStockCount.mock.calls).toHaveLength(0);
  });
});
