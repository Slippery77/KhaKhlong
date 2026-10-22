import { ConflictException, NotFoundException } from '@nestjs/common';
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
});
