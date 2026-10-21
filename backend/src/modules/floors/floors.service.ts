import {
    BadRequestException,
    ConflictException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { FloorsRepository } from './floors.repository';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';

/** ข้อความบอกทางเมื่อยังไม่ได้รัน PATCH_03 (ตาราง floors ยังไม่มีใน DB) */
const MIGRATION_HINT =
    'ยังไม่ได้ติดตั้งตารางชั้น — รัน backend/src/database/PATCH_03_floors.sql ด้วย user postgres ก่อน';

@Injectable()
export class FloorsService {
    constructor(private readonly floorsRepository: FloorsRepository) {}

    /** แปลง error ดิบจาก DB เป็น exception ที่มีข้อความภาษาไทยอ่านออก */
    private toAppError(err: any, duplicateMessage: string) {
        if (err?.code === '23505') return new ConflictException(duplicateMessage);
        if (err?.code === '42P01') return new InternalServerErrorException(MIGRATION_HINT);
        return err;
    }

    /** GET /floors — รายชั้นพร้อม "จำนวนที่ตั้งไว้" และ "จำนวนจริง" */
    async listFloors() {
        try {
            const rows = await this.floorsRepository.findAll();
            return { status: 'success', data: rows };
        } catch (err: any) {
            throw this.toAppError(err, 'ชั้นซ้ำกันในร้าน');
        }
    }

    /** POST /floors — เพิ่มชั้นใหม่ (ยังไม่ต้องมีโต๊ะ ค่อยเพิ่มทีละตัวในหน้าชั้น) */
    async create(dto: CreateFloorDto) {
        try {
            const row = await this.floorsRepository.create(
                dto.floor_no,
                dto.name?.trim() || null,
                dto.table_count,
            );
            return { status: 'success', data: row };
        } catch (err: any) {
            throw this.toAppError(err, `ชั้น ${dto.floor_no} มีอยู่แล้วในร้าน`);
        }
    }

    /**
     * PATCH /floors/:id
     * - เปลี่ยนเลขชั้น/ชื่อ/จำนวนโต๊ะที่ตั้งไว้ — โต๊ะผูกด้วย floor_id จึงไม่ต้องย้ายตาม
     * - ส่ง name มาว่าง ๆ = ล้างชื่อชั้นออก
     */
    async update(floorId: string, dto: UpdateFloorDto) {
        if (dto.floor_no === undefined && dto.name === undefined && dto.table_count === undefined) {
            throw new BadRequestException('ไม่มีข้อมูลที่เปลี่ยน');
        }

        const current = await this.floorsRepository.findById(floorId);
        if (!current) throw new NotFoundException('ไม่พบชั้นที่ต้องแก้ไข');

        const patch = {
            floor_no: dto.floor_no,
            // ไม่ส่งช่อง name มา = ไม่แตะ / ส่งมาว่าง ๆ = ล้างชื่อ
            name: dto.name === undefined ? undefined : dto.name.trim() || null,
            table_count: dto.table_count,
        };

        let updated = null;
        try {
            updated = await this.floorsRepository.update(floorId, patch);
        } catch (err: any) {
            throw this.toAppError(err, `ชั้น ${dto.floor_no} มีอยู่แล้วในร้าน`);
        }

        if (!updated) throw new NotFoundException('ไม่พบชั้นที่ต้องแก้ไข');
        return { status: 'success', data: updated };
    }

    /** DELETE /floors/:id — ลบได้เฉพาะชั้นที่ยังไม่มีโต๊ะ */
    async remove(floorId: string) {
        const current = await this.floorsRepository.findById(floorId);
        if (!current) throw new NotFoundException('ไม่พบชั้นที่ต้องลบ');

        const tableCount = await this.floorsRepository.countTables(current.floor_id);
        if (tableCount > 0) {
            throw new ConflictException(
                `ยังมีโต๊ะอยู่ในชั้น ${current.floor_no} จำนวน ${tableCount} ตัว — ย้ายโต๊ะไปชั้นอื่นก่อนลบ`,
            );
        }

        try {
            await this.floorsRepository.remove(floorId);
        } catch (err: any) {
            throw this.toAppError(err, 'ลบชั้นไม่สำเร็จ');
        }

        return { status: 'success', message: 'ลบชั้นสำเร็จ' };
    }
}
