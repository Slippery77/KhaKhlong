import { ApiProperty } from '@nestjs/swagger';

export class ConfigItemDto {
  @ApiProperty({ description: 'ชื่อ config key', example: 'kds_enabled' })
  key!: string;

  @ApiProperty({
    description:
      'ค่าปัจจุบันของร้าน (ถ้าร้านไม่มีแถว config จะใช้ default_value) แปลงเป็นชนิดจริงตาม valueType แล้ว',
    oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
    example: true,
  })
  value!: string | number | boolean;

  @ApiProperty({
    description: 'ชนิดของค่า',
    enum: ['int', 'decimal', 'bool', 'text'],
    example: 'bool',
  })
  valueType!: 'int' | 'decimal' | 'bool' | 'text';

  @ApiProperty({ description: 'ค่าต่ำสุด (เฉพาะชนิดตัวเลข)', type: Number, nullable: true, example: null })
  min!: number | null;

  @ApiProperty({ description: 'ค่าสูงสุด (เฉพาะชนิดตัวเลข)', type: Number, nullable: true, example: null })
  max!: number | null;

  @ApiProperty({ description: 'ค่าที่อนุญาต (ถ้ามี)', type: [String], nullable: true, example: null })
  allowedValues!: string[] | null;

  @ApiProperty({
    description: 'true = แก้ได้เฉพาะ Owner (tax:configure), false = Owner/Manager (config:edit_operational)',
    example: false,
  })
  ownerOnly!: boolean;

  @ApiProperty({ description: 'คำอธิบาย config', type: String, nullable: true, example: 'เปิดใช้งานจอครัว (KDS)' })
  description!: string | null;

  @ApiProperty({
    description: 'เวลาที่แก้ไขล่าสุด (null ถ้ายังใช้ค่า default)',
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-10-19T08:30:00.000Z',
  })
  updatedAt!: Date | null;
}

export class ConfigListResponseDto {
  @ApiProperty({ example: 'success' })
  status!: string;

  @ApiProperty({ type: [ConfigItemDto], description: 'config ครบทั้ง 9 key เสมอ' })
  data!: ConfigItemDto[];
}

export class ConfigItemResponseDto {
  @ApiProperty({ example: 'success' })
  status!: string;

  @ApiProperty({ type: ConfigItemDto })
  data!: ConfigItemDto;
}
