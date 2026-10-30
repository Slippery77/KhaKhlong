import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CompOrderItemDto {
  // 1 กลุ่มในตะกร้าอาจมีหลาย order_item → comp พร้อมกันในครั้งเดียว
  @IsArray()
  @ArrayNotEmpty({ message: 'ต้องระบุรายการที่ต้องการ Comp' })
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true, message: 'รหัสรายการอาหารไม่ถูกต้อง' })
  orderItemIds!: string[];

  @IsString()
  @IsNotEmpty({ message: 'กรุณาระบุเหตุผลในการ Comp' })
  reason!: string;

  // comp คือการให้ส่วนลด 100% → ต้องมีผู้จัดการ/เจ้าของร้านอนุมัติด้วย PIN
  @Matches(/^\d{6}$/, { message: 'PIN ผู้อนุมัติต้องเป็นตัวเลข 6 หลัก' })
  approverPin!: string;
}
