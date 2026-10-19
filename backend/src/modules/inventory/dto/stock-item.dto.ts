import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockItemRow } from '../inventory.types';

export class StockItemResponseDto {
  @ApiProperty({
    description: 'รหัสวัตถุดิบ (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  ingredient_id: string;

  @ApiProperty({
    description: 'ชื่อวัตถุดิบ',
    example: 'เนื้อหมูสันนอก',
  })
  name: string;

  @ApiProperty({
    description: 'หน่วยสต็อก',
    example: 'กรัม',
  })
  stock_unit: string;

  @ApiPropertyOptional({
    description: 'เกณฑ์แจ้งเตือนสต็อกต่ำ',
    example: 500,
    nullable: true,
  })
  low_stock_threshold: number | null;

  @ApiProperty({
    description:
      'ยอดสต็อกคงเหลือปัจจุบัน (คำนวณจาก SUM ของ inventory_transactions)',
    example: 1250.5,
  })
  current_stock: number;

  @ApiProperty({
    description: 'สถานะสต็อกต่ำกว่าเกณฑ์หรือไม่',
    example: false,
  })
  is_low: boolean;
}

export function toStockItemResponse(row: StockItemRow): StockItemResponseDto {
  return {
    ingredient_id: row.ingredient_id,
    name: row.name,
    stock_unit: row.stock_unit,
    low_stock_threshold:
      row.low_stock_threshold !== null && row.low_stock_threshold !== undefined
        ? Number(row.low_stock_threshold)
        : null,
    current_stock: Number(row.current_stock ?? 0),
    is_low: Boolean(row.is_low),
  };
}
