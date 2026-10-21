import { IsNotEmpty, IsString, IsInt, Min, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTableDto {
  @ApiProperty({
    description: 'เลขหรือชื่อโต๊ะ (ไม่ซ้ำกันภายในร้าน)',
    example: 'T01',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  tableNumber: string;

  @ApiProperty({
    description: 'จำนวนที่นั่งต่อโต๊ะ (ต้องมากกว่า 0)',
    example: 4,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiProperty({
    description: 'รหัสชั้น (floor_id จาก GET /floors) — ชั้นต้องถูกเพิ่มไว้ก่อน',
    example: 'c1000000-0000-0000-0000-000000000001',
    format: 'uuid',
  })
  @IsUUID()
  @IsNotEmpty()
  floorId: string;
}
