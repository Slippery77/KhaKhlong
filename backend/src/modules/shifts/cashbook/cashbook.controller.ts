import { Controller, Get, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnyAuthenticated } from '../../auth/guards/permissions.decorator';
import { CashBookQueryDTO } from '../dto/cashbook.dto';
import { ShiftsService } from '../shifts.service';

@ApiBearerAuth()
@ApiTags('cashbook')
@Controller('cashbook')
export class CashbookController {
    constructor( private readonly shiftsService:ShiftsService){}
    @ApiOperation({
    summary: 'บัญชีเงินสดรายวัน',
    description:
        'รายการขายและเงินเข้า-ออกลิ้นชักของวันทำการ เรียงตามเวลา พร้อมยอดสรุป 3 ตัว ' +
        'ทุก role เห็นทุกรายการของวันนั้น ไม่ส่ง date = วันนี้ ถ้าวันนั้นไม่มีกะ shift เป็น null และ entries ว่าง ' +
        'cashOnHand คำนวณสูตรเดียวกับยอดที่ควรมีตอนปิดกะ',
    })
    @ApiOkResponse({ description: 'สำเร็จ' })
    @ApiBadRequestResponse({ description: 'date ไม่ใช่รูปแบบ YYYY-MM-DD' })
    @AnyAuthenticated()
    @Get()
    async cashBook(@Query() query:CashBookQueryDTO){
        return this.shiftsService.getCashBook(query.date);
    }
}
