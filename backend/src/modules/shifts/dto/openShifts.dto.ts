import { IsNotEmpty, IsNumber, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class OpenShiftsDTO{
    @ApiProperty({ description: 'เงินสดตั้งต้นในลิ้นชัก (บาท)', example: 1000 })
    @IsNumber({maxDecimalPlaces:2})
    @IsNotEmpty()
    @Min(0)
    openingCash!:number
}