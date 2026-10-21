import { ApiProperty } from "@nestjs/swagger";
import { IsDefined } from "class-validator";

export class UpdateConfigDto {
    @ApiProperty({
        description:"ค่าใหม่ของ config ต้องเป็น string, number หรือ boolean (ห้าม array/object) ชนิดและช่วงค่าจะถูกตรวจโดย trigger ตาม value_type",
        oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
        example: true
    })
    @IsDefined()
    value!: string | number | boolean; // ชนิดจริงตรวจใน service ตาม value_type
}
