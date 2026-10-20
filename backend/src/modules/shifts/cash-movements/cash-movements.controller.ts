import { Controller, Post, Body , Req} from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../auth/guards/permissions.decorator';
import { ShiftsService } from '../shifts.service';
import { CreateCashMovementDTO } from '../dto/createCashMovement.dto';

@ApiBearerAuth()
@ApiTags('cash-movements')
@Controller('cash-movements')
export class CashMovementsController {
    constructor(private readonly shiftsService: ShiftsService){}
    @ApiOperation({
        summary: 'บันทึกเงินเข้า-ออกลิ้นชัก',
        description:
            'ใช้กับเงินที่ไม่ใช่การขาย เช่น ซื้อน้ำแข็ง แลกแบงก์ย่อย ระบบลงกะที่เปิดอยู่ของวันนี้ให้เอง ' +
            'movementId สร้างจากฝั่ง frontend ส่งซ้ำได้รายการเดิม ไม่เกิดรายการใหม่ ' +
            'บันทึกแล้วแก้หรือลบไม่ได้ ถ้าผิดให้บันทึกรายการกลับทาง',
    })
    @ApiCreatedResponse({ description: 'บันทึกสำเร็จ หรือได้รายการเดิมถ้า movementId ซ้ำ' })
    @ApiBadRequestResponse({ description: 'amount ไม่เป็นบวก, direction ไม่ใช่ in/out, reason ว่างหรือยาวเกิน 200' })
    @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์ cash:movement' })
    @ApiConflictResponse({ description: 'ยังไม่มีกะเปิด' })
    @RequirePermissions('cash:movement')
    @Post()
    async cashMovement(@Body() dto:CreateCashMovementDTO, @Req() req){
        const userID = req.user.sub;
        return this.shiftsService.createCashMovement(dto,userID);
    }
}
