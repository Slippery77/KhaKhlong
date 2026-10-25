import { Controller, Get, ParseUUIDPipe, Post, Param, Body, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/guards/permissions.decorator';
import { CreatePaymentAttemptDTO } from './dto/attempt.dto';
import { PayAttemptDTO } from './dto/pay-attempt.dto';
import { CancleAttempt } from './dto/canclePayment.dto';

@ApiBearerAuth()
@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}
  
   @ApiOperation({
    summary: 'เริ่มการชำระเงิน (สร้าง attempt)',
    description:
      'จองบิลที่จะชำระ รวมหลายโต๊ะได้ (PAY-01) ยอดคำนวณที่ server จากรายการในบิล ไม่รับจาก client ' +
      'attempt มีสถานะ pending จนกว่าจะเรียก /pay หรือ /cancel ระหว่างนั้นบิลถูกล็อกไม่ให้เครื่องอื่นชำระซ้ำ',
    })
    @ApiResponse({ status: 201, description: 'สร้าง attempt สำเร็จ คืน paymentAttemptId และยอดที่ต้องชำระ' })
    @ApiResponse({ status: 400, description: 'body ไม่ถูกต้อง (orderIds ว่าง ซ้ำ หรือไม่ใช่ UUID)' })
    @ApiResponse({ status: 404, description: 'ไม่พบบิลบางใบ' })
    @ApiResponse({
      status: 409,
      description:
        'ไม่มีกะเปิดอยู่ / มีบิลที่ปิดไปแล้ว / ยังมีรายการที่ยังไม่ได้เสิร์ฟ (PAY-03) / ' +
        'บิลมีการชำระค้างอยู่ (code: PAYMENT_ATTEMPT_PENDING พร้อม paymentAttemptId)',
    })
    @RequirePermissions('payment:receive')
    @Post('attempts')
    async createPayment(@Body() dto:CreatePaymentAttemptDTO,@Req() req){
      const userID = req.user?.sub
      return this.paymentService.createPaymentAttempt(dto,userID);
    }

    @ApiOperation({
      summary: 'ดูรายละเอียด attempt',
      description: 'ใช้ดูสถานะและยอดที่ต้องชำระ (pending / success / failed / timeout)',
    })
    @ApiParam({ name: 'id', format: 'uuid', description: 'paymentAttemptId' })
    @ApiResponse({ status: 200, description: 'พบ attempt' })
    @ApiResponse({ status: 404, description: 'ไม่พบรายการชำระเงิน' })
    @RequirePermissions('payment:receive')
    @Get('attempts/:payment_attempt_id')
    async listAttemptId(@Param('payment_attempt_id',ParseUUIDPipe) id:string){
      return this.paymentService.listAttemptById(id);
    }

    @ApiOperation({summary:'',description:''})
    @RequirePermissions('payment:receive')
    @Post('attempts/:id/cancel')
    async canclePayment(@Param('id',ParseUUIDPipe) paymentAttemptId:string,@Body() dto:CancleAttempt){
      return this.paymentService.cancleAttempt(paymentAttemptId,dto.reason);
    }

    @ApiOperation({
      summary: 'ยืนยันรับเงิน',
      description:
        'เงินสด: ต้องส่ง cashReceived และต้องไม่น้อยกว่ายอด ระบบคำนวณเงินทอนให้ ' +
        'QR: ส่ง body ว่าง {} หลังพนักงานตรวจว่าเงินเข้าบัญชีแล้ว ' +
        'สำเร็จแล้วระบบออกเลขใบเสร็จ ปิดทุกบิลใน attempt และคืนโต๊ะเป็นว่าง ' +
        'เรียกซ้ำกับ attempt ที่จ่ายแล้วจะได้ใบเสร็จเดิม ไม่สร้างใหม่',
    })
    @ApiParam({ name: 'id', format: 'uuid', description: 'paymentAttemptId' })
    @ApiResponse({ status: 201, description: 'ชำระสำเร็จ คืนข้อมูลใบเสร็จ (receiptNumber, changeAmount)' })
    @ApiResponse({
      status: 400,
      description: 'เงินสดไม่ได้ระบุ cashReceived / รับเงินมาไม่พอ / QR ส่ง cashReceived มา',
    })
    @ApiResponse({ status: 404, description: 'ไม่พบรายการชำระเงิน' })
    @ApiResponse({
      status: 409,
      description: 'ไม่มีกะเปิดอยู่ / รายการนี้ถูกยกเลิกแล้ว / ยอดบิลเปลี่ยนไปหลังเริ่มชำระ',
    })
    @ApiOperation({summary:'',description:''})
    @RequirePermissions('payment:receive')
    @Post('attempts/:id/pay')
    async acceptPayments(@Param('id',ParseUUIDPipe) paymentAttemptId:string, @Body() dto:PayAttemptDTO, @Req() req:any){
      const userId = req.user?.sub;
      return this.paymentService.payAttempt(paymentAttemptId,dto,userId)
    }

    @ApiOperation({
      summary: 'ดูยอดรวมก่อนชำระเงิน',
      description:
        'อ่านยอดรวมของบิลที่ยังเปิดอยู่จาก v_order_item_totals ใช้แสดงยอดก่อนกดเริ่มชำระ ' +
        'ไม่สร้าง attempt ไม่จองบิล และไม่รับยอดจาก client',
    })
    @ApiParam({ name: 'orderId', format: 'uuid', description: 'รหัสบิล (UUID)' })
    @ApiResponse({ status: 200, description: 'ยอดรวมและจำนวนรายการในบิล' })
    @ApiResponse({ status: 404, description: 'ไม่พบบิล' })
    @ApiResponse({ status: 409, description: 'บิลถูกปิดไปแล้ว' })
    @RequirePermissions('payment:receive')
    @Get('orders/:orderId/summary')
    async getOrderSummary(@Param('orderId', ParseUUIDPipe) orderId: string) {
      return this.paymentService.getOrderSummary(orderId);
    }

    @ApiOperation({
      summary: 'ดูข้อมูลใบเสร็จ',
      description:
        'ข้อมูลครบสำหรับแสดงหรือพิมพ์ใบเสร็จ: ร้าน โต๊ะ รายการอาหาร (รวมจานเหมือนกันข้ามโต๊ะ) ยอด เงินรับ เงินทอน ' +
        'เลขผู้เสียภาษีแสดงเฉพาะร้านที่เปิด VAT อ่านอย่างเดียว ไม่นับเป็นการพิมพ์',
    })
    @ApiParam({ name: 'id', format: 'uuid', description: 'paymentId (ไม่ใช่ paymentAttemptId)' })
    @ApiResponse({ status: 200, description: 'พบใบเสร็จ' })
    @ApiResponse({ status: 404, description: 'ไม่พบใบเสร็จ' })
    @RequirePermissions('payment:receive')
    @Get('/:id/receipt')
    async getReceipt(@Param('id',ParseUUIDPipe) payment_id:string){
      return this.paymentService.getReceipt(payment_id);
    }

    @ApiOperation({
      summary: 'บันทึกการพิมพ์ใบเสร็จ',
      description:
        'เรียกทุกครั้งที่กดพิมพ์ รวมครั้งแรก จำนวนครั้งจำกัดตาม max_reprints ของร้าน (0 = ไม่จำกัด) ' +
        'คืน printCount และ isCopy เพื่อให้หน้าจอพิมพ์คำว่า "สำเนา" บนใบที่ 2 เป็นต้นไป',
    })
    @ApiParam({ name: 'id', format: 'uuid', description: 'paymentId' })
    @ApiResponse({ status: 201, description: 'บันทึกการพิมพ์แล้ว คืน printCount และ isCopy' })
    @ApiResponse({ status: 404, description: 'ไม่พบใบเสร็จ' })
    @ApiResponse({ status: 409, description: 'พิมพ์ซ้ำครบจำนวนที่ร้านกำหนดแล้ว' })
    @RequirePermissions('payment:receive')
    @Post('/:id/print')
    async printReceipt(@Param('id',ParseUUIDPipe) paymentId:string, @Req() req:any){
      const userId = req.user?.sub;
      return this.paymentService.printReceipt(paymentId,userId)
    }
}
