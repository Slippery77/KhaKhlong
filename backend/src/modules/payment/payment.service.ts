import {
    BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, NotFoundException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { PaymentRepository, SlipCheckRow } from './payment.repository';
import { VerifySlipDTO } from './dto/verify-slip.dto';
import { SlipOkClient, SlipOkInput, SlipOkQuota } from './slipok/slipok.client';
import {
    SLIP_MAX_AGE_BEFORE_ATTEMPT_MS, SlipError, mapSlipOkError, matchReceiver, slipTransAt,
} from './slipok/slip-rules';
import { CreatePaymentAttemptDTO } from './dto/attempt.dto';
import { ShiftsService } from '../shifts/shifts.service';
import { PayAttemptDTO} from './dto/pay-attempt.dto';
import { toPaymentAttemptResponse, toPaymentResponse, toReceiptResponse } from './mapper/payment.mapper';
import generatePayload from 'promptpay-qr';

@Injectable()
export class PaymentService {
    /** โควต้าเป็นของบัญชีกลาง ไม่ผูกร้าน แคชไว้ 60 วินาทีกันยิง SlipOK ทุกครั้งที่เปิดหน้าชำระ */
    private quotaCache: { at: number; value: SlipOkQuota | null } | null = null;

    constructor(private readonly paymentRepository: PaymentRepository ,
        private readonly shiftService : ShiftsService,
        private readonly slipOk: SlipOkClient,
    ){}

    async listAttemptById(id:string){
        const result = await this.paymentRepository.listAttemptById(id);
        if(!result){
            throw new NotFoundException('ไม่พบรายการการชำระเงิน')
        }
        return {status:'success', data:toPaymentAttemptResponse(result)};
    }

    async getOrderSummary(orderId:string){
        const orders = await this.paymentRepository.findOrders([orderId])
        if(orders.length === 0){
            throw new NotFoundException('ไม่พบบิลนี้')
        }
        if(orders[0].closed_at !== null){
            throw new ConflictException('บิลนี้ถูกปิดไปแล้ว')
        }

        const summary = await this.paymentRepository.computeOrderSummary(orderId)
        return {
            status:'success',
            data: { orderId, amount: summary.amount, itemCount: summary.itemCount },
        }
    }

    /**
     * ยอดรวมก่อนชำระเงินของหลายบิล (รวมโต๊ะคิดเงิน)
     * ใช้สูตรเดียวกับ createPaymentAttempt (computeAmount) เพื่อให้ยอดที่โชว์ตรงกับ attempt.amount
     */
    async getOrdersSummary(rawOrderIds: string[]) {
        const orderIds = Array.from(new Set(rawOrderIds)).sort();
        const orders = await this.paymentRepository.findOrders(orderIds)
        if(orders.length !== orderIds.length){
            throw new NotFoundException('ไม่พบบิลบางใบ')
        }
        if(orders.some(o => o.closed_at !== null)){
            throw new ConflictException('มีบิลที่ปิดไปแล้ว')
        }
        const {gross,itemCount} = await this.paymentRepository.computeAmount(orderIds)
        return {
            status:'success',
            data: { orderIds, amount: gross, itemCount },
        }
    }

    async createPaymentAttempt(dto:CreatePaymentAttemptDTO,userId:string){
        let promptpayId: string | null = null;

        const shift = await this.shiftService.getCurrentShift()
        if(shift.data?.status !== 'open'){
            throw new ConflictException('ไม่มีกะถูกเปิด')
        }

        if (dto.paymentMethod === 'qr_code') {
            promptpayId = await this.paymentRepository.findPromptpayId();
            if (!promptpayId) {
                throw new ConflictException({ code: 'PROMPTPAY_NOT_SET', message: 'ร้านยังไม่ได้ตั้งค่าพร้อมเพย์' });
            }
        }

        const orderIds = Array.from(new Set(dto.orderIds)).sort();
        const orders = await this.paymentRepository.findOrders(orderIds)
        if(orders.length !== orderIds.length){
            throw new NotFoundException('ไม่พบบิลนี้')
        }
        if(orders.some(o => o.closed_at !== null)){
            throw new ConflictException('มีบิลที่ปิดไปแล้ว')
        }

        const findpending = await this.paymentRepository.findOpenAttempt(orderIds)
        if(findpending.length>0){
            throw new ConflictException({
                 code: 'PAYMENT_ATTEMPT_PENDING',
                message: 'บิลนี้มีการชำระเงินค้างอยู่',
                paymentAttemptId: findpending[0].payment_attempt_id,
            })
        }

        const {gross,itemCount} = await this.paymentRepository.computeAmount(orderIds)
        if(itemCount === 0){
            throw new ConflictException({
                code:'ORDER_EMPTY',
                message:'บิลไม่มีรายการอาหาร ใช้ปิดบิลโดยไม่เก็บเงิน',
            })
        }        
        let create;
        try {
            create = await this.paymentRepository.createPaymentAttempt(dto.paymentMethod,gross,userId)
            await this.paymentRepository.linkOrders(create.payment_attempt_id,orderIds);
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
        const qrPayload = promptpayId ? generatePayload(promptpayId, {amount: Number(create.amount)}) : null;
        return {status:'success' , data:{...toPaymentAttemptResponse(create), qrPayload}}
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
            if (!payment) {
                throw new ConflictException('รายการนี้อยู่ระหว่างบันทึกการชำระเงิน กรุณาลองใหม่อีกครั้ง');
            }
            return {status:'success', data:toPaymentResponse(payment)};
        }
        
        const amount = Number(attempt.amount);
        if(attempt.payment_method === 'cash'){
            if(typeof dto.cashReceived !== 'number' || isNaN(dto.cashReceived)){
                throw new BadRequestException('กรุณาระบุจำนวนเงินที่ได้รับมา')
            }
            if(dto.cashReceived<amount){
                throw new BadRequestException('รับเงินมาไม่พอ');
            }
        }else if( dto.cashReceived != null){
            throw new BadRequestException('ชำระด้วย QR ไม่ต้องระบุเงินที่รับมา')
        }
        //ยอดรวมใช้เทียบว่ายอดบิลยังเท่ากับ attempt.amount ไหม
        const gross  = await this.paymentRepository.computeGrossByAttempt(payment_attempt_id);
        if(Math.abs(gross - amount) > 0.005){
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

    /** ฟีเจอร์ตรวจสลิปเปิดอยู่ไหม + โควต้าคงเหลือ (บัญชี SlipOK กลาง) */
    async getSlipVerificationStatus() {
        if (!this.slipOk.isConfigured()) {
            return { status: 'success', data: { enabled: false, quota: null } };
        }
        const now = Date.now();
        if (!this.quotaCache || now - this.quotaCache.at > 60_000) {
            this.quotaCache = { at: now, value: await this.slipOk.getQuota() };
        }
        return { status: 'success', data: { enabled: true, quota: this.quotaCache.value } };
    }

    /**
     * ตรวจสลิปกับ SlipOK แล้วปิดบิลทันทีถ้าผ่าน (เรียก payAttempt ใน transaction เดียวกัน)
     * ยอดที่ส่งให้ SlipOK คือ attempt.amount จาก server เสมอ
     * ไม่ผ่าน = โยน error พร้อม code ให้หน้าจอ, attempt ยัง pending ให้ตรวจใหม่หรือกดยืนยันรับเงินเองได้
     */
    async verifySlip(paymentAttemptId: string, dto: VerifySlipDTO, userId: string) {
        const hasQr = !!dto.qrData?.trim();
        const hasImage = !!dto.imageBase64?.trim();
        if (hasQr === hasImage) {
            throw new BadRequestException({ code: 'SLIP_INPUT_MISSING', message: 'ส่งข้อมูล QR หรือรูปสลิปอย่างใดอย่างหนึ่ง' });
        }
        let input: SlipOkInput;
        if (hasQr) {
            input = { qrData: dto.qrData!.trim() };
        } else {
            const base64 = dto.imageBase64!.replace(/^data:image\/[a-z+.-]+;base64,/i, '').replace(/\s/g, '');
            if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
                throw new BadRequestException({ code: 'SLIP_IMAGE_INVALID', message: 'รูปสลิปไม่ถูกต้อง' });
            }
            input = { imageBase64: base64 };
        }
        const source: 'image' | 'qr_data' = hasQr ? 'qr_data' : 'image';

        if (!this.slipOk.isConfigured()) {
            throw new ServiceUnavailableException({ code: 'SLIPOK_NOT_CONFIGURED', message: 'ระบบยังไม่ได้เปิดใช้การตรวจสลิป' });
        }
        // เช็คกะก่อนเรียก SlipOK — ไม่งั้นเสียโควต้าแล้วไปล้มที่ payAttempt
        const shift = await this.shiftService.getCurrentShift();
        if (shift.data?.status !== 'open') throw new ConflictException('ไม่มีกะถูกเปิด');

        // ล็อก attempt ก่อนเรียก SlipOK กัน 2 เครื่องตรวจสลิปคนละใบให้บิลเดียวกันพร้อมกัน
        const attempt = await this.paymentRepository.lockAttempt(paymentAttemptId);
        if (!attempt) throw new NotFoundException('ไม่พบรายการชำระเงิน');
        if (attempt.payment_method !== 'qr_code') {
            throw new BadRequestException({ code: 'NOT_QR_PAYMENT', message: 'ตรวจสลิปได้เฉพาะการชำระแบบ QR' });
        }
        if (attempt.status === 'failed' || attempt.status === 'timeout') {
            throw new ConflictException('รายการนี้ถูกยกเลิกแล้ว');
        }
        if (attempt.status === 'success') {
            // ชำระไปแล้ว (เช่น กดซ้ำ) คืนใบเสร็จเดิม ไม่เสียโควต้า
            const paid = await this.payAttempt(paymentAttemptId, {}, userId);
            return { status: 'success', data: { payment: paid.data, slip: null } };
        }

        const amount = Number(attempt.amount);
        const promptpayId = await this.paymentRepository.findPromptpayId();
        if (!promptpayId) {
            throw new ConflictException({ code: 'PROMPTPAY_NOT_SET', message: 'ร้านยังไม่ได้ตั้งค่าพร้อมเพย์' });
        }

        const res = await this.slipOk.checkSlip(input, amount);
        const slip = res.slip;
        const base: SlipCheckRow = {
            paymentAttemptId,
            source,
            transRef: slip?.transRef ?? null,
            amount: slip?.amount ?? null,
            sendingBank: slip?.sendingBank ?? null,
            receivingBank: slip?.receivingBank ?? null,
            receiverName: slip?.receiver?.displayName || slip?.receiver?.name || null,
            receiverProxy: slip?.receiver?.proxy?.value || null,
            receiverAccount: slip?.receiver?.account?.value || null,
            transAt: slip ? slipTransAt(slip) : null,
            rawResponse: res.raw,
            checkedBy: userId,
        };
        const reject = async (err: SlipError): Promise<never> => {
            await this.paymentRepository.insertFailedSlipDurable({ ...base, result: err.result, errorCode: err.code });
            throw new HttpException({ code: err.code, message: err.message }, err.status);
        };

        if (!res.ok) return reject(mapSlipOkError(res.code, res.message));

        // ตรวจซ้ำฝั่งเราทุกข้อ แม้ SlipOK เช็คยอดให้แล้ว (log: false ไม่เช็คผู้รับและสลิปซ้ำ)
        if (Math.abs(Number(res.slip.amount) - amount) > 0.005) {
            return reject(mapSlipOkError(1013, ''));
        }
        const receiverMatch = matchReceiver(res.slip, promptpayId);
        if (receiverMatch === 'mismatch') return reject(mapSlipOkError(1014, ''));

        const createdAt = new Date(attempt.created_at).getTime();
        if (base.transAt && base.transAt.getTime() < createdAt - SLIP_MAX_AGE_BEFORE_ATTEMPT_MS) {
            return reject({
                code: 'SLIP_TOO_OLD',
                status: HttpStatus.UNPROCESSABLE_ENTITY,
                message: 'สลิปนี้โอนก่อนเริ่มชำระบิลนี้ อาจเป็นสลิปเก่า',
                result: 'rejected',
            });
        }

        const inserted = await this.paymentRepository.insertVerifiedSlip({ ...base, receiverMatch });
        if (!inserted) return reject(mapSlipOkError(1012, ''));

        const paid = await this.payAttempt(paymentAttemptId, {}, userId);
        return {
            status: 'success',
            data: {
                payment: paid.data,
                slip: {
                    transRef: res.slip.transRef,
                    amount: Number(res.slip.amount),
                    sendingBank: base.sendingBank,
                    senderName: res.slip.sender?.displayName || res.slip.sender?.name || null,
                    receiverName: base.receiverName,
                    receiverMatch,
                    transAt: base.transAt?.toISOString() ?? null,
                },
            },
        };
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
