import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InventoryRepository } from './inventory.repository';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { toIngredientResponse } from './dto/ingredient-response.dto';
import { toStockItemResponse } from './dto/stock-item.dto';
import { RestockDto } from './dto/restock.dto';
import { RecordWasteDto } from './dto/record-waste.dto';
import { RecordStockCountDto } from './dto/record-stock-count.dto';
import {
  GetInventoryTransactionsQueryDto,
  toInventoryTransactionResponse,
} from './dto/inventory-transaction.dto';

function hasPostgresCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

function hasErrorMessage(error: unknown, message: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.includes(message)
  );
}

@Injectable()
export class InventoryService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  /**
   * สร้างวัตถุดิบใหม่
   */
  async createIngredient(dto: CreateIngredientDto) {
    try {
      const result = await this.inventoryRepository.createIngredient(dto);
      return {
        status: 'success',
        data: toIngredientResponse(result),
      };
    } catch (err: unknown) {
      if (hasPostgresCode(err, '23505')) {
        throw new ConflictException(
          'ชื่อวัตถุดิบซ้ำกับวัตถุดิบที่มีอยู่แล้วในร้าน',
        );
      }
      throw err;
    }
  }

  /**
   * ดึงรายการวัตถุดิบทั้งหมด
   */
  async findAllIngredients(includeInactive = false) {
    const rows =
      await this.inventoryRepository.findAllIngredients(includeInactive);
    return {
      status: 'success',
      data: rows.map(toIngredientResponse),
    };
  }

  /**
   * ดึงข้อมูลวัตถุดิบตาม ID
   */
  async findIngredientById(id: string) {
    const row = await this.inventoryRepository.findIngredientById(id);
    if (!row) {
      throw new NotFoundException('ไม่พบข้อมูลวัตถุดิบ');
    }
    return {
      status: 'success',
      data: toIngredientResponse(row),
    };
  }

  /**
   * แก้ไขข้อมูลวัตถุดิบ
   */
  async updateIngredient(id: string, dto: UpdateIngredientDto) {
    try {
      const result = await this.inventoryRepository.updateIngredient(id, dto);
      if (!result) {
        throw new NotFoundException('ไม่พบข้อมูลวัตถุดิบที่ต้องการแก้ไข');
      }
      return {
        status: 'success',
        data: toIngredientResponse(result),
      };
    } catch (err: unknown) {
      if (hasPostgresCode(err, '23505')) {
        throw new ConflictException('ชื่อวัตถุดิบซ้ำกับวัตถุดิบอื่นในร้าน');
      }
      throw err;
    }
  }

  /**
   * ลบวัตถุดิบแบบ Soft Delete
   */
  async softDeleteIngredient(id: string) {
    const result = await this.inventoryRepository.softDeleteIngredient(id);
    if (!result) {
      throw new NotFoundException('ไม่พบข้อมูลวัตถุดิบที่ต้องการลบ');
    }

    return {
      status: 'success',
      message: 'ลบวัตถุดิบสำเร็จ',
    };
  }

  /**
   * ดึงระดับสต็อกคงเหลือปัจจุบัน (จาก view v_ingredient_stock)
   */
  async getStock(isLow?: boolean, includeInactive = false) {
    const rows = await this.inventoryRepository.getStockList(
      isLow,
      includeInactive,
    );
    return {
      status: 'success',
      data: rows.map(toStockItemResponse),
    };
  }

  /**
   * บันทึกรับของเข้าสต็อก (restock)
   */
  async restock(dto: RestockDto, userId?: string) {
    const ingredient = await this.inventoryRepository.findIngredientById(
      dto.ingredient_id,
    );
    if (!ingredient || !ingredient.is_active) {
      throw new NotFoundException(
        'ไม่พบข้อมูลวัตถุดิบ หรือวัตถุดิบถูกปิดการใช้งานแล้ว',
      );
    }

    if (dto.quantity <= 0) {
      throw new BadRequestException('จำนวนที่รับเข้าต้องมากกว่า 0');
    }

    const tx = await this.inventoryRepository.recordRestock(
      dto.ingredient_id,
      dto.quantity,
      userId,
      dto.note,
    );

    return {
      status: 'success',
      data: toInventoryTransactionResponse({
        ...tx,
        ingredient_name: ingredient.name,
        stock_unit: ingredient.stock_unit,
      }),
    };
  }

  /**
   * บันทึกของเสีย (waste)
   */
  async recordWaste(dto: RecordWasteDto, userId?: string) {
    const ingredient = await this.inventoryRepository.findIngredientById(
      dto.ingredient_id,
    );
    if (!ingredient || !ingredient.is_active) {
      throw new NotFoundException(
        'ไม่พบข้อมูลวัตถุดิบ หรือวัตถุดิบถูกปิดการใช้งานแล้ว',
      );
    }

    if (dto.quantity <= 0) {
      throw new BadRequestException('จำนวนของเสียต้องมากกว่า 0');
    }

    const tx = await this.inventoryRepository.recordWaste(
      dto.ingredient_id,
      dto.quantity,
      dto.waste_reason,
      userId,
      dto.note,
    );

    return {
      status: 'success',
      data: toInventoryTransactionResponse({
        ...tx,
        ingredient_name: ingredient.name,
        stock_unit: ingredient.stock_unit,
      }),
    };
  }

  /**
   * นับยอดคงเหลือสิ้นวัน (periodic stock count)
   * คำนวณ delta ผ่านฟังก์ชัน record_stock_count() ของ PostgreSQL
   */
  async recordStockCount(dto: RecordStockCountDto, userId?: string) {
    const ingredient = await this.inventoryRepository.findIngredientById(
      dto.ingredient_id,
    );
    if (!ingredient || !ingredient.is_active) {
      throw new NotFoundException(
        'ไม่พบข้อมูลวัตถุดิบ หรือวัตถุดิบถูกปิดการใช้งานแล้ว',
      );
    }

    if (dto.counted_quantity < 0) {
      throw new BadRequestException('ยอดที่นับได้ต้องไม่ติดลบ');
    }

    try {
      const res = await this.inventoryRepository.recordStockCount(
        dto.ingredient_id,
        dto.counted_quantity,
        userId,
        dto.note,
      );

      const delta = Number(res.delta ?? 0);

      return {
        status: 'success',
        data: {
          ingredient_id: dto.ingredient_id,
          ingredient_name: ingredient.name,
          stock_unit: ingredient.stock_unit,
          counted_quantity: dto.counted_quantity,
          delta,
          message:
            delta === 0
              ? 'ยอดสต็อกตรงกับระบบ ไม่มีการปรับยอด'
              : `ปรับปรุงยอดสต็อกสำเร็จ (ส่วนต่าง ${delta > 0 ? '+' : ''}${delta} ${ingredient.stock_unit})`,
        },
      };
    } catch (err: unknown) {
      if (hasErrorMessage(err, 'ingredient not found')) {
        throw new NotFoundException('ไม่พบข้อมูลวัตถุดิบ');
      }
      if (hasErrorMessage(err, 'lacks permission')) {
        throw new ForbiddenException(
          'ไม่มีสิทธิ์ inventory:adjust ในการนับสต็อก',
        );
      }
      throw err;
    }
  }

  /**
   * ดึงประวัติการเคลื่อนไหวสต็อก (transactions)
   */
  async getTransactions(query: GetInventoryTransactionsQueryDto) {
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const [rows, total] = await Promise.all([
      this.inventoryRepository.findTransactions(
        query.ingredient_id,
        query.type,
        limit,
        offset,
      ),
      this.inventoryRepository.countTransactions(
        query.ingredient_id,
        query.type,
      ),
    ]);

    return {
      status: 'success',
      data: rows.map(toInventoryTransactionResponse),
      pagination: {
        total,
        limit,
        offset,
      },
    };
  }
}
