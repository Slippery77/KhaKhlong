import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsIn,
  Matches,
  IsOptional,
} from 'class-validator';

export class CreateUserDTO {
  // ชื่อผู้ใช้สำหรับเข้าสู่ระบบ — ต้องไม่ซ้ำภายในร้าน (บังคับที่ DB: uq_users_tenant_username_lower)
  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกชื่อผู้ใช้' })
  @MaxLength(100, { message: 'ชื่อผู้ใช้ต้องไม่เกิน 100 ตัวอักษร' })
  username!: string;

  // 72 = ขีดจำกัดของ bcrypt — ยาวกว่านี้ bcrypt จะตัดทิ้งเงียบ ๆ
  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกรหัสผ่าน' })
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  @MaxLength(72, { message: 'รหัสผ่านต้องไม่เกิน 72 ตัวอักษร' })
  password!: string;

  // PIN 6 หลัก สำหรับสลับผู้ใช้หน้าร้าน
  // ^ = เริ่มต้นข้อความ | \d = ตัวเลข 0-9 | {6} = มีจำนวน 6 ตัว | $ = สิ้นสุด
  @Matches(/^\d{6}$/, { message: 'PIN ต้องเป็นตัวเลข 6 หลัก' })
  @IsOptional()
  pin?: string;

  // ชื่อ-นามสกุล เก็บเป็น field เดียว (display_name ในตาราง users)
  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกชื่อ-นามสกุล' })
  @MaxLength(100, { message: 'ชื่อ-นามสกุลต้องไม่เกิน 100 ตัวอักษร' })
  display_name!: string;

  // เจ้าของร้านสร้างได้แค่ manager / employee — owner มีตอนสมัครร้านเท่านั้น
  @IsIn(['employee', 'manager'], { message: 'ตำแหน่งต้องเป็นผู้จัดการหรือพนักงาน' })
  role_name!: 'employee' | 'manager';
}
