import { ApiProperty } from "@nestjs/swagger";
import { Matches } from "class-validator";

export class VerifyShiftDto {
    @ApiProperty({
        description: "PIN 6 หลักของผู้จัดการ/เจ้าของร้านผู้รับรองยอดปิดกะ",
        example: "123456",
    })
    @Matches(/^\d{6}$/, { message: "PIN ต้องเป็นตัวเลข 6 หลัก" })
    pin!: string;
}
