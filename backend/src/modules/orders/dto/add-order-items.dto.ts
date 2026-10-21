import { IsUUID, IsNotEmpty, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @ApiProperty({
    description: 'รหัสรายการอาหาร (UUID จาก client 1 จานต่อ 1 แถว)',
    example: 'c1d2e3f4-a5b6-7890-1234-56789abcdef0',
  })
  @IsUUID()
  @IsNotEmpty()
  orderItemId!: string;

  @ApiProperty({
    description: 'รหัสเมนูอาหาร (UUID)',
    example: 'd1e2f3a4-b5c6-7890-1234-56789abcdef1',
  })
  @IsUUID()
  @IsNotEmpty()
  menuItemId!: string;

  @ApiPropertyOptional({
    description: 'คำขอพิเศษ (เช่น ไม่ใส่ผักชี, หวานน้อย)',
    example: 'ไม่ใส่ผักชี',
  })
  @IsOptional()
  @IsString()
  specialRequest?: string;

  @ApiPropertyOptional({
    description: 'รายการรหัส modifier_id ที่เลือก (UUID[])',
    example: ['e1f2a3b4-c5d6-7890-1234-56789abcdef2'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  modifierIds?: string[];
}

export class AddOrderItemsDto {
  @ApiProperty({
    description: 'รายการอาหารที่ต้องการเพิ่มลงในบิล',
    type: [CreateOrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiPropertyOptional({
    description: 'รหัส kitchen ticket (UUID จาก client — 1 ค่าต่อการกดส่งครัว 1 รอบ)',
    example: 'f1a2b3c4-d5e6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  kitchenTicketId?: string;
}
