import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetAvailabilityMenuDTO{
    @ApiProperty({description:'false = ของหมดวันนี้ สั่งไม่ได้ · true = กลับมาขายได้',example:false})
    @IsBoolean()
    is_available!:boolean;
}