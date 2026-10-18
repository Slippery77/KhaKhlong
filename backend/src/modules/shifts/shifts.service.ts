import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ShiftsRepository } from './shifts.repository';
import { OpenShiftsDTO } from './dto/openShifts.dto';
import { toCashBookResponse, toCashMovementResponse, toShiftResponse } from './mapper/shift.mapper';
import { OrdersService } from '../orders/orders.service';
import { ClosingShiftDTO } from './dto/closeShift.dto';
import { CreateCashMovementDTO } from './dto/createCashMovement.dto';
import { ReopenShiftDto } from './dto/reopenShift.dto';
import { ListShiftsQueryDto } from './dto/listShift.dto';

@Injectable()
export class ShiftsService {
    constructor(private readonly shiftRepository:ShiftsRepository,
        private readonly orderService:OrdersService
    ){}
    async openShift(dto:OpenShiftsDTO,userId:string){
        let result;
        try{
             result = await this.shiftRepository.openShift(dto.openingCash,userId);
        }
        catch(err:any){
            if(err.code === 'P0001' && err.message?.includes('lacks permission')){
                throw new ForbiddenException('ไม่มีสิทธิ์เข้าถึง');
            }
            if(err.code==='23505'){
                throw new ConflictException('วันนี้มีการเปิดกะแล้ว'); 
            }
            throw err
        }
        return {
            status:'success',
            data:toShiftResponse(result)
        }
    }

    async getCurrentShift(){
        const result = await this.shiftRepository.getCurrentShift();
        return {
            status:'success',
            data: result ? toShiftResponse(result) : null
        }
    }

    async closingShift(dto:ClosingShiftDTO,userId:string,shiftId:string){
        let result;
        
        const checkShift = await this.shiftRepository.getShiftStatusForUpdate(shiftId);
        if(!checkShift){
            throw new NotFoundException('ไม่พบกะนี้')
        }
        if(checkShift.status !=='open'){
            throw new ConflictException('กะนี้ปิดไปแล้ว')
        }
        try{
            const orders = await this.orderService.findOpenOrdersForClose()
            if(orders.length > 0){
                throw new ConflictException({ 
                    code: 'OPEN_ORDERS_BLOCK_CLOSE',
                    message: `ปิดกะไม่ได้ ยังมีบิลค้าง ${orders.length} ใบ`,
                    orders
                });
            }
            
            result = await this.shiftRepository.closingShift(dto.actualClosingCash,userId,shiftId);
        }catch(err:any){
            if(err.code === 'P0001' && err.message?.includes('lacks permission')){
                throw new ForbiddenException('ไม่มีสิทธิ์ปิดกะ');
            }
            throw err;
        }
        return {
            status:'success',
            data:toShiftResponse(result)
        }
    }

    async createCashMovement(dto:CreateCashMovementDTO,userId:string){
        let result;
        const shift = await this.shiftRepository.getCurrentShift();
        if (!shift || shift.status !== 'open') {
            throw new ConflictException('ยังไม่มีกะเปิด บันทึกเงินเข้า-ออกไม่ได้');
        }
        try {
            result = await this.shiftRepository.createCashMovement(dto.movementId,shift.shift_id,dto.direction,dto.amount,dto.reason,userId)
            if(!result){
                result = await this.shiftRepository.findCashMovement(dto.movementId);
                if(!result){
                    throw new ConflictException('movementId นี้ถูกใช้แล้ว');
                }
            }
        } catch (err:any) {
            if(err.code === 'P0001' && err.message?.includes('lacks permission'))
                throw new ForbiddenException('ไม่มีสิทธิ์สร้างรายการเงิน');
            if(err.code === 'P0001' && err.message?.includes('shift is not open'))
                throw new ConflictException('ไม่พบกะที่เปิด')
            throw err;
        }
        return {
            status:"success",
            data:toCashMovementResponse(result)
        }
    }
    async getCashBook(date?:string){
        const day = await this.shiftRepository.findDateAndShift(date ?? null);
        if(!day.shift_id){
            return { status: 'success', data: {
                businessDate: day.business_date, shift: null,
                summary: { cashOnHand: null, cashSales: 0, transferSales: 0 }, entries: [],
            }};
        }
        const entries = await this.shiftRepository.listTransaction(day.business_date, day.shift_id)
        const summary = await this.shiftRepository.findCashbookSummary(day.business_date, day.shift_id)
        return { status: 'success', data: toCashBookResponse(day, summary, entries) };
    }

    async reopenShift(shiftId:string,user_id:string,dto:ReopenShiftDto){
        let result;
        try {
            result = await this.shiftRepository.reopenShift(shiftId,user_id,dto.reason)
        } catch (error:any) {
            const msg:string = error.message ?? '';
            if(error.code === 'P0001'){
                if (msg.includes('reason is required')) throw new BadRequestException('ต้องระบุเหตุผล');
                if (msg.includes('shift not found')) throw new NotFoundException('ไม่พบกะนี้');
                if (msg.includes('lacks permission')) throw new ForbiddenException('ไม่มีสิทธิ์เปิดกะใหม่');
                if (msg.includes('cannot reopen')) throw new ConflictException('กะนี้เปิดใหม่ไม่ได้ (เปิดอยู่แล้ว หรือรับรองยอดแล้ว)');
            }
            throw error;
        }
        return {status:'success', data:toShiftResponse(result)}
    }
    
    async verifyShift(shift_id:string, userId:string){
        let result;
        try {
            result = await this.shiftRepository.verifyShift(shift_id,userId);
            if (!result) throw new NotFoundException('ไม่พบกะนี้');
        } catch (err:any) {
            const msg:string = err.message??'';
            if(err.code === 'P0001'){
                if (msg.includes('invalid shift transition')) throw new ConflictException('กะนี้ไม่ต้องรับรอง หรือรับรองไปแล้ว');
                if (msg.includes('must be verified by owner')) throw new ForbiddenException('กะที่ส่งต่อแล้วต้องให้เจ้าของร้านรับรอง');
                if (msg.includes('lacks permission')) throw new ForbiddenException('ไม่มีสิทธิ์รับรองยอด');
            }
            throw err;
        }
        return {status:'success', data:toShiftResponse(result)};
    }

    async listShifts(q:ListShiftsQueryDto){
        const page = q.page ?? 1;
        const limit = q.limit ?? 30;
        const result = await this.shiftRepository.listShift(q.from ?? null, q.to ?? null, q.status ?? null,limit + 1, (page - 1) * limit)
        const hasMore = result.length > limit;
        return {
            status:'success',
            data:{
                items: result.slice(0, limit).map(toShiftResponse),
                page, limit, hasMore,
            }
        }
    
    }
}