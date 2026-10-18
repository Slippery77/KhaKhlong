import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, Min } from "class-validator";


export class ClosingShiftDTO{
    @ApiProperty(
        {
            description:"เงินตอนปิดกะ",
            example:5000
        }
    )
    @IsNumber({maxDecimalPlaces:2})
    @Min(0)
    @IsNotEmpty()
    actualClosingCash!:number;
}