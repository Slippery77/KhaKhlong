import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IngredientRow } from '../inventory.types';

export class IngredientResponseDto {
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
    description: 'หน่วยที่ใช้เก็บสต็อก',
    example: 'กรัม',
  })
  stock_unit: string;

  @ApiPropertyOptional({
    description: 'หน่วยที่ใช้ซื้อ',
    example: 'กิโลกรัม',
    nullable: true,
  })
  purchase_unit: string | null;

  @ApiPropertyOptional({
    description: 'อัตราแปลงหน่วยซื้อเป็นหน่วยเก็บ',
    example: 1000,
    nullable: true,
  })
  purchase_to_stock_ratio: number | null;

  @ApiPropertyOptional({
    description: 'เกณฑ์แจ้งเตือนสต็อกต่ำ',
    example: 500,
    nullable: true,
  })
  low_stock_threshold: number | null;

  @ApiProperty({
    description: 'สถานะเปิดใช้งาน',
    example: true,
  })
  is_active: boolean;

  @ApiProperty({
    description: 'เวลาสร้าง',
    example: '2026-10-19T00:00:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'เวลาแก้ไขล่าสุด',
    example: '2026-10-19T00:00:00.000Z',
  })
  updated_at: Date;
}

export function toIngredientResponse(
  row: IngredientRow,
): IngredientResponseDto {
  return {
    ingredient_id: row.ingredient_id,
    name: row.name,
    stock_unit: row.stock_unit,
    purchase_unit: row.purchase_unit ?? null,
    purchase_to_stock_ratio:
      row.purchase_to_stock_ratio !== null &&
      row.purchase_to_stock_ratio !== undefined
        ? Number(row.purchase_to_stock_ratio)
        : null,
    low_stock_threshold:
      row.low_stock_threshold !== null && row.low_stock_threshold !== undefined
        ? Number(row.low_stock_threshold)
        : null,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
