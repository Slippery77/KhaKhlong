import { Body, Controller, Get, Param, Post, Req, ParseUUIDPipe, HttpStatus, HttpCode, Query } from '@nestjs/common';
import { AnyAuthenticated, RequirePermissions } from '../auth/guards/permissions.decorator';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { OpenShiftsDTO } from './dto/openShifts.dto';
import { ClosingShiftDTO } from './dto/closeShift.dto';
import { ReopenShiftDto } from './dto/reopenShift.dto';
import { ListShiftsQueryDto } from './dto/listShift.dto';

@ApiBearerAuth()
@ApiTags('shifts')
@Controller('shifts')
export class ShiftsController {
    constructor(private readonly shiftsService: ShiftsService){}

    @ApiOperation({
        summary:"เปิดกะของวันนี้",
        description:
        'เปิดกะพร้อมเงินสดตั้งต้นในลิ้นชัก 1 วันทำการเปิดได้ 1 กะ ' +
        'ระบบกำหนด businessDate และ openedBy ให้เอง ไม่ต้องส่งมา ' +
        'ต้องเปิดกะก่อนจึงจะเปิดบิลและรับชำระเงินได้ ' +
        'ถ้ากะของวันนี้ถูกปิดไปแล้ว ต้องให้ Manager/Owner ใช้ reopen ไม่ใช่เปิดใหม่',
    })
    @RequirePermissions('shift:open')
    @Post('open')
    async openShift(@Body() dto:OpenShiftsDTO, @Req() req){
        const userId = req.user.sub;
        return this.shiftsService.openShift(dto, userId);
    }

    @ApiOperation({
        summary:"ดูกะของวันทำการปัจจุบัน",
        description:'เรียกหลัง login เพื่อเลือกหน้าที่จะแสดง: data เป็น null = ยังไม่เปิดกะ (ไปหน้าเปิดกะ), ' +
            'status เป็น open = ขายได้, สถานะอื่น = ปิดกะแล้ว ' +
            'ระหว่างกะเปิด expectedClosingCash เป็น null เสมอ ระบบคำนวณตอนปิดกะเท่านั้น',
    })
    @ApiOkResponse({ description: 'สำเร็จ data เป็นกะของวันนี้ หรือ null ถ้ายังไม่เปิด' })
    @AnyAuthenticated()
    @Get('current')
    async currentShift(){
        return this.shiftsService.getCurrentShift();
    }

    @ApiOperation({
        summary:"ปิดกะ",
        description:'กรอกเงินสดที่นับได้ ระบบคำนวณยอดที่ควรมีเอง (เงินเปิดกะ + ขายเงินสด + เงินเข้า − เงินออก) ' +
            'ยอดตรงปิดอัตโนมัติ (closed_auto) ยอดไม่ตรงรอผู้จัดการรับรอง (pending_verification) ' +
            'ถ้ายังมีบิลค้างจะปิดไม่ได้ และได้รายการบิลกลับไปใน 409',
    })
    @ApiOkResponse({ description: 'ปิดสำเร็จ ได้ status, expectedClosingCash และ variance' })
    @ApiBadRequestResponse({ description: 'actualClosingCash ไม่ถูกต้อง หรือ id ไม่ใช่ UUID' })
    @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์ shift:close_and_count' })
    @ApiNotFoundResponse({ description: 'ไม่พบกะนี้' })
    @ApiConflictResponse({ description: 'กะปิดไปแล้ว หรือยังมีบิลค้าง (code: OPEN_ORDERS_BLOCK_CLOSE)' })
    @HttpCode(200)
    @RequirePermissions('shift:close_and_count')
    @Post(':shift_id/close')
    async closingShift(@Param('shift_id',ParseUUIDPipe) shiftID:string, @Body() dto:ClosingShiftDTO , @Req() req){
        const userId = req.user.sub;
        return this.shiftsService.closingShift(dto,userId,shiftID);
    }

    @ApiOperation({
    summary: 'เปิดกะที่ปิดไปแล้วใหม่',
    description:
        'ใช้เมื่อกดปิดกะผิด ต้องระบุเหตุผล เงินเปิดกะคงเดิม ยอดปิดกะถูกล้าง ' +
        'เปิดได้เฉพาะกะ closed_auto และ pending_verification กะที่รับรองแล้วปิดตาย ' +
        'ระบบบันทึก audit พร้อมยอดเดิมให้อัตโนมัติ',
    })
    @ApiOkResponse({ description: 'เปิดใหม่สำเร็จ status กลับเป็น open' })
    @ApiBadRequestResponse({ description: 'ไม่ระบุเหตุผล หรือ id ไม่ใช่ UUID' })
    @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์ shift:reopen (Manager/Owner เท่านั้น)' })
    @ApiNotFoundResponse({ description: 'ไม่พบกะนี้' })
    @ApiConflictResponse({ description: 'กะเปิดอยู่แล้ว หรือรับรองยอดแล้ว' })
    @HttpCode(200)
    @RequirePermissions('shift:reopen')
    @Post(':shift_id/reopen')
    async reopenShift(@Param('shift_id',ParseUUIDPipe) shiftId:string, @Body() dto:ReopenShiftDto, @Req() req){
        const userId = req.user.sub;
        return this.shiftsService.reopenShift(shiftId,userId,dto);
    }

    @ApiOperation({
        summary: 'รับรองยอดปิดกะ',
        description:
            'ใช้กับกะที่ยอดเงินไม่ตรง (pending_verification) Manager หรือ Owner กดรับรองได้ ' +
            'ถ้ากะถูกส่งต่อ (escalated) ต้องเป็น Owner รับรองแล้วกะปิดตาย เปิดใหม่ไม่ได้',
    })
    @ApiOkResponse({ description: 'รับรองสำเร็จ status เป็น verified' })
    @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์ shift:verify หรือกะ escalated แต่ไม่ใช่ Owner' })
    @ApiNotFoundResponse({ description: 'ไม่พบกะนี้' })
    @ApiConflictResponse({ description: 'กะไม่ได้อยู่ในสถานะที่ต้องรับรอง' })
    @HttpCode(200)
    @RequirePermissions('shift:verify')
    @Post(':shift_id/verify')
    async verifyShift(@Param('shift_id',ParseUUIDPipe) shiftId:string, @Req() req ){
        const userId = req.user.sub;
        return this.shiftsService.verifyShift(shiftId, userId);
    }


    @ApiOperation({
        summary: 'ประวัติกะ',
        description:
            'รายการกะย้อนหลัง เรียงวันล่าสุดก่อน กรองด้วยช่วงวันและสถานะได้ ' +
            'ใช้ status=pending_verification หากะที่รอรับรอง แบ่งหน้าด้วย page/limit ดู hasMore ว่ามีหน้าถัดไปไหม',
    })
    @ApiOkResponse({ description: 'สำเร็จ' })
    @ApiBadRequestResponse({ description: 'รูปแบบวันที่, status หรือ page/limit ไม่ถูกต้อง' })
    @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์ report:view_all (Manager/Owner เท่านั้น)' })
    @RequirePermissions('report:view_all')
    @Get()
    async listShifts(@Query() query: ListShiftsQueryDto) {
    return this.shiftsService.listShifts(query);
    }
}
