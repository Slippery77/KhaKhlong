import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * ขอยอดรวมก่อนชำระเงินของหลายบิล (รวมโต๊ะคิดเงิน — PAY-01)
 * ข้อจำกัดเหมือน CreatePaymentAttemptDTO เพื่อให้ยอดที่โชว์ตรงกับยอดตอนสร้าง attempt
 */
export class OrdersSummaryDTO {
    @ApiProperty({
        type: [String],
        format: 'uuid',
        minItems: 1,
        maxItems: 10,
        description: 'บิลที่ต้องการดูยอดรวม (บิลเปิดของแต่ละโต๊ะ)',
    })
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(10)
    @ArrayUnique()
    @IsUUID('all', { each: true })
    orderIds!: string[];
}

