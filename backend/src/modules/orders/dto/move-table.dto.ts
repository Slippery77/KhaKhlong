import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MoveTableDto {
  @ApiProperty({
    description: 'รหัสโต๊ะปลายทางที่ต้องการย้ายไป (UUID)',
    example: 'b7e2d4f1-3c8a-4e5b-9f1d-2a6c8e0b4d7f',
  })
  @IsUUID()
  @IsNotEmpty()
  newTableId: string;
}
