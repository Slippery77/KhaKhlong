import { Injectable } from '@nestjs/common';
import { DbContextService } from '../../database/db-context.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import {
  IngredientRow,
  InventoryTransactionRow,
  StockCountResultRow,
  StockItemRow,
  TotalRow,
} from './inventory.types';

const INGREDIENT_COLS = `ingredient_id, tenant_id, name, stock_unit, purchase_unit,
  purchase_to_stock_ratio, low_stock_threshold, is_active, created_at, updated_at`;

@Injectable()
export class InventoryRepository {
  constructor(private readonly db: DbContextService) {}

  /**
   * สร้างวัตถุดิบใหม่ในตาราง ingredients
   */
  async createIngredient(dto: CreateIngredientDto) {
    const sql = `
      INSERT INTO ingredients (
        tenant_id,
        name,
        stock_unit,
        purchase_unit,
        purchase_to_stock_ratio,
        low_stock_threshold
      ) VALUES (
        app_tenant_id(),
        $1,
        $2,
        $3,
        $4,
        $5
      )
      RETURNING ${INGREDIENT_COLS};
    `;
    const result = await this.db.query<IngredientRow>(sql, [
      dto.name.trim(),
      dto.stock_unit.trim(),
      dto.purchase_unit?.trim() ?? null,
      dto.purchase_to_stock_ratio ?? null,
      dto.low_stock_threshold ?? null,
    ]);
    return result.rows[0];
  }

  /**
   * ดึงรายการวัตถุดิบทั้งหมดของร้าน
   */
  async findAllIngredients(includeInactive = false) {
    const sql = `
      SELECT ${INGREDIENT_COLS}
      FROM ingredients
      WHERE ($1 = true OR is_active = true)
      ORDER BY name ASC;
    `;
    const result = await this.db.query<IngredientRow>(sql, [includeInactive]);
    return result.rows;
  }

  /**
   * ค้นหาวัตถุดิบตาม ID
   */
  async findIngredientById(id: string) {
    const sql = `
      SELECT ${INGREDIENT_COLS}
      FROM ingredients
      WHERE ingredient_id = $1;
    `;
    const result = await this.db.query<IngredientRow>(sql, [id]);
    return result.rows[0] ?? null;
  }

  /**
   * อัปเดตข้อมูลวัตถุดิบ
   */
  async updateIngredient(id: string, dto: UpdateIngredientDto): Promise<IngredientRow | null> {
    const sql = `
      UPDATE ingredients
      SET
        name = COALESCE($2, name),
        stock_unit = COALESCE($3, stock_unit),
        purchase_unit = COALESCE($4, purchase_unit),
        purchase_to_stock_ratio = COALESCE($5, purchase_to_stock_ratio),
        low_stock_threshold = COALESCE($6, low_stock_threshold),
        is_active = COALESCE($7, is_active),
        updated_at = now()
      WHERE ingredient_id = $1
      RETURNING ${INGREDIENT_COLS};
    `;
    const result = await this.db.query<IngredientRow>(sql, [
      id,
      dto.name ? dto.name.trim() : null,
      dto.stock_unit ? dto.stock_unit.trim() : null,
      dto.purchase_unit !== undefined ? dto.purchase_unit : null,
      dto.purchase_to_stock_ratio !== undefined
        ? dto.purchase_to_stock_ratio
        : null,
      dto.low_stock_threshold !== undefined ? dto.low_stock_threshold : null,
      dto.is_active !== undefined ? dto.is_active : null,
    ]);
    return result.rows[0] ?? null;
  }

  /**
   * ลบวัตถุดิบแบบ Soft Delete (is_active = false)
   */
  async softDeleteIngredient(id: string) {
    const sql = `
      UPDATE ingredients
      SET is_active = false, updated_at = now()
      WHERE ingredient_id = $1
      RETURNING ${INGREDIENT_COLS};
    `;
    const result = await this.db.query<IngredientRow>(sql, [id]);
    return result.rows[0] ?? null;
  }

  /**
   * ดึงระดับสต็อกคงเหลือปัจจุบัน จาก view v_ingredient_stock
   */
  async getStockList(isLow?: boolean, includeInactive = false) {
    const sql = `
      SELECT
        v.ingredient_id,
        v.name,
        v.stock_unit,
        v.low_stock_threshold,
        v.current_stock,
        v.is_low
      FROM v_ingredient_stock v
      JOIN ingredients i ON i.ingredient_id = v.ingredient_id
      WHERE (i.is_active = true OR $1 = true)
        AND ($2::boolean IS NULL OR v.is_low = $2)
      ORDER BY v.name ASC;
    `;
    const result = await this.db.query<StockItemRow>(sql, [
      includeInactive,
      isLow ?? null,
    ]);
    return result.rows;
  }

  /**
   * บันทึกรับของเข้าสต็อก (type: restock, quantity_change: +quantity)
   */
  async recordRestock(
    ingredientId: string,
    quantity: number,
    createdBy?: string,
    note?: string,
  ) {
    const sql = `
      INSERT INTO inventory_transactions (
        tenant_id,
        ingredient_id,
        type,
        quantity_change,
        note,
        created_by
      ) VALUES (
        app_tenant_id(),
        $1,
        'restock',
        $2,
        $3,
        COALESCE($4, app_user_id())
      )
      RETURNING
        transaction_id,
        tenant_id,
        ingredient_id,
        type,
        quantity_change,
        counted_quantity,
        waste_reason,
        note,
        created_by,
        created_at;
    `;
    const result = await this.db.query<InventoryTransactionRow>(sql, [
      ingredientId,
      quantity,
      note?.trim() || null,
      createdBy || null,
    ]);
    return result.rows[0];
  }

  /**
   * บันทึกของเสีย (type: waste, quantity_change: -quantity, waste_reason บังคับมีค่า)
   */
  async recordWaste(
    ingredientId: string,
    quantity: number,
    wasteReason: string,
    createdBy?: string,
    note?: string,
  ) {
    const sql = `
      INSERT INTO inventory_transactions (
        tenant_id,
        ingredient_id,
        type,
        quantity_change,
        waste_reason,
        note,
        created_by
      ) VALUES (
        app_tenant_id(),
        $1,
        'waste',
        ($2)::numeric * -1,
        $3,
        $4,
        COALESCE($5, app_user_id())
      )
      RETURNING
        transaction_id,
        tenant_id,
        ingredient_id,
        type,
        quantity_change,
        counted_quantity,
        waste_reason,
        note,
        created_by,
        created_at;
    `;
    const result = await this.db.query<InventoryTransactionRow>(sql, [
      ingredientId,
      Math.abs(quantity),
      wasteReason,
      note?.trim() || null,
      createdBy || null,
    ]);
    return result.rows[0];
  }

  /**
   * นับยอดคงเหลือสิ้นวันผ่านฟังก์ชัน PostgreSQL record_stock_count()
   * ฟังก์ชันจะล็อกแถววัตถุดิบ คำนวณ delta และยิง audit_logs ให้อัตโนมัติเมื่อผิดปกติ
   */
  async recordStockCount(
    ingredientId: string,
    countedQuantity: number,
    userId?: string,
    note?: string,
  ) {
    const sql = `
      SELECT record_stock_count(
        app_tenant_id(),
        $1,
        $2,
        COALESCE($3, app_user_id()),
        $4
      ) AS delta;
    `;
    const result = await this.db.query<StockCountResultRow>(sql, [
      ingredientId,
      countedQuantity,
      userId || null,
      note?.trim() || null,
    ]);
    return result.rows[0];
  }

  /**
   * ดึงประวัติการเคลื่อนไหวสต็อก (inventory_transactions)
   */
  async findTransactions(
    ingredientId?: string,
    type?: string,
    limit = 50,
    offset = 0,
  ) {
    const sql = `
      SELECT
        t.transaction_id,
        t.ingredient_id,
        i.name AS ingredient_name,
        i.stock_unit,
        t.type,
        t.quantity_change,
        t.counted_quantity,
        t.waste_reason,
        t.note,
        t.created_by,
        t.created_at
      FROM inventory_transactions t
      JOIN ingredients i ON i.ingredient_id = t.ingredient_id
      WHERE ($1::uuid IS NULL OR t.ingredient_id = $1)
        AND ($2::varchar IS NULL OR t.type = $2)
      ORDER BY t.created_at DESC
      LIMIT $3 OFFSET $4;
    `;
    const result = await this.db.query<InventoryTransactionRow>(sql, [
      ingredientId || null,
      type || null,
      limit,
      offset,
    ]);
    return result.rows;
  }

  /**
   * นับจำนวนรายการการเคลื่อนไหวสต็อกทั้งหมดตามตัวกรอง
   */
  async countTransactions(
    ingredientId?: string,
    type?: string,
  ): Promise<number> {
    const sql = `
      SELECT count(*)::int AS total
      FROM inventory_transactions t
      WHERE ($1::uuid IS NULL OR t.ingredient_id = $1)
        AND ($2::varchar IS NULL OR t.type = $2);
    `;
    const result = await this.db.query<TotalRow>(sql, [
      ingredientId || null,
      type || null,
    ]);
    return result.rows[0]?.total ?? 0;
  }
}
