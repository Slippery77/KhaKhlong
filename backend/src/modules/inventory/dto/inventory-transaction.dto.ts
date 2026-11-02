import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsIn, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryTransactionRow } from '../inventory.types';

export class InventoryTransactionResponseDto {
  @ApiProperty({
    description: 'รหัสรายการ (UUID)',
    example: '660e8400-e29b-41d4-a716-446655440001',
  })
  transaction_id: string;

  @ApiProperty({
    description: 'รหัสวัตถุดิบ (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  ingredient_id: string;

  @ApiPropertyOptional({
    description: 'ชื่อวัตถุดิบ',
    example: 'เนื้อหมูสันนอก',
  })
  ingredient_name?: string;

  @ApiPropertyOptional({
    description: 'หน่วยสต็อก',
    example: 'กรัม',
  })
  stock_unit?: string;

  @ApiProperty({
    description:
      'ประเภทรายการ: restock (รับของ), adjustment (ปรับจากการนับ), waste (ของเสีย)',
    enum: ['restock', 'adjustment', 'waste'],
    example: 'restock',
  })
  type: string;

  @ApiProperty({
    description: 'ปริมาณที่เปลี่ยนแปลง (บวกคือเพิ่ม ลบคือลด ห้ามเป็น 0)',
    example: 1000,
  })
  quantity_change: number;

  @ApiPropertyOptional({
    description: 'ยอดที่พนักงานนับได้จริง (มีค่าเฉพาะประเภท adjustment)',
    example: 850,
    nullable: true,
  })
  counted_quantity: number | null;

  @ApiPropertyOptional({
    description:
      'สาเหตุของเสีย: expired, spoiled, dropped, other (มีค่าเฉพาะประเภท waste)',
    example: 'spoiled',
    nullable: true,
  })
  waste_reason: string | null;

  @ApiPropertyOptional({
    description: 'บันทึกเพิ่มเติม',
    example: 'ซื้อของเข้าสต็อกรอบเช้า',
    nullable: true,
  })
  note: string | null;

  @ApiProperty({
    description: 'รหัสผู้บันทึกรายการ (UUID)',
    example: '110e8400-e29b-41d4-a716-446655440002',
  })
  created_by: string;

  @ApiProperty({
    description: 'เวลาบันทึกรายการ',
    example: '2026-10-19T00:00:00.000Z',
  })
  created_at: Date;

  @ApiPropertyOptional({
    description: 'วันทำการที่เกิดรายการ (YYYY-MM-DD)',
    example: '2026-10-31',
  })
  business_date?: string;
}

export class GetInventoryTransactionsQueryDto {
  @ApiPropertyOptional({
    description: 'กรองตามรหัสวัตถุดิบ (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  ingredient_id?: string;

  @ApiPropertyOptional({
    description: 'กรองตามประเภท: restock, adjustment, waste',
    enum: ['restock', 'adjustment', 'waste'],
    example: 'restock',
  })
  @IsIn(['restock', 'adjustment', 'waste'])
  @IsOptional()
  type?: 'restock' | 'adjustment' | 'waste';

  @ApiPropertyOptional({
    description: 'กรองตามวันทำการ (YYYY-MM-DD)',
    example: '2026-10-31',
  })
  @IsDateString()
  @IsOptional()
  business_date?: string;

  @ApiPropertyOptional({
    description: 'จำนวนแถวที่ต้องการดึง (ค่าเริ่มต้น 50, สูงสุด 200)',
    example: 50,
    default: 50,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'ตำแหน่งเริ่มต้น (Offset สำหรับ pagination)',
    example: 0,
    default: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number = 0;
}

export function toInventoryTransactionResponse(
  row: InventoryTransactionRow,
): InventoryTransactionResponseDto {
  return {
    transaction_id: row.transaction_id,
    ingredient_id: row.ingredient_id,
    ingredient_name: row.ingredient_name ?? undefined,
    stock_unit: row.stock_unit ?? undefined,
    type: row.type,
    quantity_change: Number(row.quantity_change),
    counted_quantity:
      row.counted_quantity !== null && row.counted_quantity !== undefined
        ? Number(row.counted_quantity)
        : null,
    waste_reason: row.waste_reason ?? null,
    note: row.note ?? null,
    created_by: row.created_by,
    created_at: row.created_at,
    business_date: row.business_date ?? undefined,
  };
}
