import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentAttemptDTO {
    @ApiProperty({
        type: [String],
        format: 'uuid',
        minItems: 1,
        maxItems: 10,
        description: 'บิลที่ต้องการชำระ บิลเดียวส่ง 1 ตัว รวมโต๊ะส่งหลายตัว (PAY-01)',
    })
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(10)
    @ArrayUnique()
    @IsUUID('all', { each: true })
    orderIds!: string[];

    @ApiProperty({ enum: ['cash', 'qr_code'], example: 'cash' })
    @IsIn(['cash', 'qr_code'])
    paymentMethod!: 'cash' | 'qr_code';
}