import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class VoidOrderItemDto {
  // 1 กลุ่มในตะกร้าอาจมีหลาย order_item (เช่น สั่ง 2 ที่) → ส่งมาทั้งหมดเพื่อยกเลิกในครั้งเดียว
  @IsArray()
  @ArrayNotEmpty({ message: 'ต้องระบุรายการที่ต้องการยกเลิก' })
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true, message: 'รหัสรายการอาหารไม่ถูกต้อง' })
  orderItemIds!: string[];

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุเหตุผลในการยกเลิก' })
  reason!: string;

  // ทุกครั้งที่ void ต้องมีผู้จัดการ/เจ้าของร้านอนุมัติด้วย PIN ของตัวเอง
  @Matches(/^\d{6}$/, { message: 'PIN ผู้อนุมัติต้องเป็นตัวเลข 6 หลัก' })
  approverPin!: string;
}
