import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentRepository } from './payment.repository';
import { CreatePaymentAttemptDTO } from './dto/attempt.dto';
import { ShiftsService } from '../shifts/shifts.service';
import { PayAttemptDTO} from './dto/pay-attempt.dto';
import { toPaymentAttemptResponse, toPaymentResponse, toReceiptResponse } from './mapper/payment.mapper';

@Injectable()
export class PaymentService {
    constructor(private readonly paymentRepository: PaymentRepository , 
        private readonly shiftService : ShiftsService,
    ){}

    async listAttemptById(id:string){
        const result = await this.paymentRepository.listAttemptById(id);
        if(!result){
            throw new NotFoundException('ไม่พบรายการการชำระเงิน')
        }
        return {status:'success', data:toPaymentAttemptResponse(result)};
    }

    async createPaymentAttempt(dto:CreatePaymentAttemptDTO,userId:string){
        const shift = await this.shiftService.getCurrentShift()
        if(shift.data?.status !== 'open'){
            throw new ConflictException('ไม่มีกะถูกเปิด')
        }

        const orders = await this.paymentRepository.findOrders(dto.orderIds)
        if(orders.length !== dto.orderIds.length){
            throw new NotFoundException('ไม่พบบิลนี้')
        }
        if(orders.some(o => o.closed_at !== null)){
            throw new ConflictException('มีบิลที่ปิดไปแล้ว')
        }

        const findpending = await this.paymentRepository.findOpenAttempt(dto.orderIds)
        if(findpending.length>0){
            throw new ConflictException({
                 code: 'PAYMENT_ATTEMPT_PENDING',
                message: 'บิลนี้มีการชำระเงินค้างอยู่',
                paymentAttemptId: findpending[0].payment_attempt_id,
            })
        }

        const amount = await this.paymentRepository.computeAmount(dto.orderIds)        
        let create;
        try {
            create = await this.paymentRepository.createPaymentAttempt(dto.paymentMethod,amount,userId)
            await this.paymentRepository.linkOrders(create.payment_attempt_id,dto.orderIds);
        } catch (error:any) {
            if(error.code==='P0001'){
                if(error.message.includes('PAY-03')){
                    throw new ConflictException('ยังมีรายการที่ยังไม่ได้เสิร์ฟ')
                }
                if(error.message.includes('order already closed')){
                    throw new ConflictException('บิลนี้ถูกปิดแล้ว')
                }
            }
            if(error.code === '23505'){
                throw new ConflictException('บิลนี้มีการชำระเงินค้างอยู่')
            }
            throw error;
        }
        return {status:'success' , data:toPaymentAttemptResponse(create)}
    }

    async payAttempt(payment_attempt_id:string,dto:PayAttemptDTO,userId:string){
        let result;
        
        const shift = await this.shiftService.getCurrentShift()
        if(shift.data?.status !== 'open'){
            throw new ConflictException('ไม่มีกะถูกเปิด')
        }

        const attempt = await this.paymentRepository.lockAttempt(payment_attempt_id);
        if(!attempt){
            throw new NotFoundException('ไม่พบรายการชำระเงิน');
        }
        if(attempt.status ==='failed' || attempt.status ==='timeout'){
            throw new ConflictException('รายการนี้ถูกยกเลิกแล้ว')
        }
        if(attempt.status==='success'){
            const payment = await this.paymentRepository.findPaymentByAttempt(payment_attempt_id);
            return {status:'success', data:toPaymentResponse(payment)};
        }
        
        const amount = Number(attempt.amount);
        if(attempt.payment_method === 'cash'){
            if(dto.cashReceived === undefined){
                throw new BadRequestException('กรุณาระบุจำนวนเงินที่ได้รับมา')
            }
            if(dto.cashReceived<amount){
                throw new BadRequestException('รับเงินมาไม่พอ');
            }
        }else if( dto.cashReceived !== undefined){
            throw new BadRequestException('ชำระด้วย QR ไม่ต้องระบุเงินที่รับมา')
        }
        //ยอดรวมใช้เทียบว่ายอดบิลยังเท่ากับ attempt.amount ไหม
        const gross  = await this.paymentRepository.computeGrossByAttempt(payment_attempt_id);
        if(gross!== amount){
            throw new ConflictException('ยอดบิลเปลี่ยนไป กรุณายกเลิกแล้วเริ่มชำระใหม่');
        }
       

        await this.paymentRepository.markAttemptSuccess(payment_attempt_id);
        try {
            result = await this.paymentRepository.insertPayment(payment_attempt_id, gross, 0,amount,attempt.payment_method,dto.cashReceived ?? null,userId);
        } catch (error:any) {
            if(error.code === 'P0001'){
                if(error.message.includes('attempt already finalized'))
                    throw new ConflictException('รายการนี้ชำระไปแล้ว')
                if(error.message.includes('no open shift'))
                    throw new ConflictException('ไม่มีกะถูกเปิด')
                if(error.message.includes('does not match'))
                    throw new ConflictException('ยอดไม่ตรง')
            }
            throw error
        }
        return {status:'success', data:toPaymentResponse(result)}
    }

    async cancleAttempt(paymentAttemptId:string,reason:string){
        const attempt = await this.paymentRepository.lockAttempt(paymentAttemptId)
        if(!attempt){
            throw new NotFoundException('ไม่พบรายการชำระเงิน');
        }
        if(attempt.status ==='failed' || attempt.status ==='timeout'){
            throw new ConflictException('รายการนี้ถูกยกเลิกแล้ว')
        }
        if (attempt.status === 'success') 
            throw new ConflictException('ชำระไปแล้ว ยกเลิกไม่ได้');        
        const result = await this.paymentRepository.cancleAttempt(paymentAttemptId,reason)
        return {status:'success',data:toPaymentAttemptResponse(result)}
    }

    async getReceipt(paymentId:string){
        const payment = await this.paymentRepository.findPaymentForReceipt(paymentId);
        if (!payment) throw new NotFoundException('ไม่พบใบเสร็จ');
        const store = await this.paymentRepository.findStore();
        const tables = await this.paymentRepository.findReceiptTables(paymentId);
        const lines = await this.paymentRepository.getReceiptLines(paymentId);
        return { status: 'success', data: toReceiptResponse(payment, store, tables, lines) };
    }

    async printReceipt(paymentId:string,userId:string){  
        try {
            const printCount = await this.paymentRepository.printReceipt(paymentId, userId);
            return { status: 'success', data: { printCount, isCopy: printCount > 1 } };
        } catch (error: any) {
            if (error.code === 'P0001' && error.message.includes('reprint limit reached'))
                throw new ConflictException('พิมพ์ซ้ำครบจำนวนที่ร้านกำหนดแล้ว');
            if (error.code === '23503') throw new NotFoundException('ไม่พบใบเสร็จ');
            throw error;
        }
    }
}
