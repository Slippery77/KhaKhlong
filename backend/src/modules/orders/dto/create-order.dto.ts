import { IsUUID, IsNotEmpty, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './add-order-items.dto';

export class CreateOrderDto {
  @ApiProperty({
    description: 'รหัสบิล (UUID จาก client เพื่อรองรับการทำงานแบบ Offline-first)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({
    description: 'รหัสโต๊ะที่เปิดบิล (UUID)',
    example: 'b7e2d4f1-3c8a-4e5b-9f1d-2a6c8e0b4d7f',
  })
  @IsUUID()
  @IsNotEmpty()
  tableId: string;

  @ApiPropertyOptional({
    description: 'รายการอาหารที่สั่งพร้อมการเปิดบิล (ถ้ามี)',
    type: [CreateOrderItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];
}
