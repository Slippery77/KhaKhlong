import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsIn,
  IsOptional,
} from 'class-validator';

/**
 * ทุกช่องเป็น optional — ส่งเฉพาะที่ต้องการแก้
 * ถ้าไม่ส่งช่องไหนเลย service จะตอบ 400 (ไม่มีอะไรให้แก้)
 */
export class UpdateUserDTO {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'ชื่อ-นามสกุลต้องไม่ว่าง' })
  @MaxLength(100, { message: 'ชื่อ-นามสกุลต้องไม่เกิน 100 ตัวอักษร' })
  display_name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'ชื่อผู้ใช้ต้องไม่ว่าง' })
  @MaxLength(100, { message: 'ชื่อผู้ใช้ต้องไม่เกิน 100 ตัวอักษร' })
  username?: string;

  @IsOptional()
  @IsIn(['employee', 'manager'], { message: 'ตำแหน่งต้องเป็นผู้จัดการหรือพนักงาน' })
  role_name?: 'employee' | 'manager';

  // ใส่เฉพาะตอนต้องการตั้งรหัสผ่านใหม่ — เว้นว่าง = ไม่เปลี่ยนรหัสผ่าน
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'รหัสผ่านต้องไม่ว่าง' })
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  @MaxLength(72, { message: 'รหัสผ่านต้องไม่เกิน 72 ตัวอักษร' })
  password?: string;
}
