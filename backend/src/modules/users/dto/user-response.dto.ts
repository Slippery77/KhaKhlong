import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 'b1c2d3e4-0000-4000-8000-000000000001' })
  user_id!: string;

  @ApiProperty({ example: 'benz' })
  username!: string;

  @ApiProperty({ example: 'เบนซ์ ใจดี' })
  display_name!: string;

  @ApiProperty({ enum: ['owner', 'manager', 'employee'], example: 'employee' })
  role_name!: string;

  @ApiProperty({ example: true })
  is_active!: boolean;

  @ApiProperty({ example: '2026-10-01T09:00:00.000Z' })
  created_at!: string;

  @ApiProperty({ example: '2026-10-21T12:30:00.000Z', nullable: true })
  last_login_at!: string | null;

  @ApiProperty({ example: null, nullable: true })
  deactivated_at!: string | null;

  @ApiProperty({ example: true, description: 'ตั้ง PIN แล้วหรือยัง' })
  has_pin!: boolean;
}

export class UserStoreInfoDto {
  @ApiProperty({ example: 'a0b1c2d3-0000-4000-8000-000000000001' })
  tenant_id!: string;

  @ApiProperty({ example: 'ร้านอาหารข้าวมันไก่' })
  restaurant_name!: string;

  @ApiProperty({ example: 'kaomunkai' })
  tenant_slug!: string;
}

export class UserMeResponseDto extends UserResponseDto {
  @ApiProperty({
    type: [String],
    example: ['order:create', 'order:view', 'menu:view'],
    description: 'รายการสิทธิ์ทั้งหมดของผู้ใช้ตามตำแหน่ง (role)',
  })
  permissions!: string[];

  @ApiProperty({
    type: UserStoreInfoDto,
    description: 'ข้อมูลสรุปของร้านที่ผู้ใช้สังกัด',
  })
  store!: UserStoreInfoDto;
}
