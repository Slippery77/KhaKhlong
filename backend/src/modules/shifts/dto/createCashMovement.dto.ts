import { IsUUID, IsIn, IsNumber, IsPositive, IsString, IsNotEmpty, MaxLength} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCashMovementDTO {
    @ApiProperty({ format: 'uuid', example: 'b3a1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
    description: 'UUID ที่ frontend สร้างเอง (crypto.randomUUID()) กันกดซ้ำ' })
    @IsUUID()
    movementId!: string;

    @ApiProperty({ enum: ['in', 'out'], example: 'out' })
    @IsIn(['in', 'out'])
    direction!: 'in' | 'out';

    @ApiProperty({ example: 80 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    amount!: number;

    @ApiProperty({ example: 'ซื้อน้ำแข็ง', maxLength: 200 })
    @IsString() @IsNotEmpty() @MaxLength(200)
    reason!: string;
}