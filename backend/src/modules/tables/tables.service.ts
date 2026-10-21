import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { TablesRepository } from './tables.repository';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

/** ข้อความบอกทางเมื่อยังไม่ได้รัน PATCH_03 (ตาราง floors ยังไม่มีใน DB) */
const FLOORS_MIGRATION_HINT =
  'ยังไม่ได้ติดตั้งตารางชั้น — รัน backend/src/database/PATCH_03_floors.sql ด้วย user postgres ก่อน';

@Injectable()
export class TablesService {
  constructor(private readonly tablesRepository: TablesRepository) { }

  /**
   * กันสร้าง/ย้ายโต๊ะเข้าชั้นที่ยังไม่ได้เพิ่ม — ขั้นตอนแรกของหน้าตั้งค่าโต๊ะคือ "เพิ่มชั้นก่อน"
   * (DB มี FK คุมอยู่แล้ว แต่เช็คก่อนเพื่อให้ได้ข้อความภาษาไทยที่คนอ่านออก)
   */
  private async assertFloorExists(floorId: string) {
    let floor;
    try {
      floor = await this.tablesRepository.findFloorById(floorId);
    } catch (err: any) {
      if (err?.code === '42P01') throw new InternalServerErrorException(FLOORS_MIGRATION_HINT);
      throw err;
    }
    if (!floor) {
      throw new BadRequestException(
        'ไม่พบชั้นที่เลือก — เพิ่มชั้นก่อนเพิ่มโต๊ะ (ตั้งค่าโต๊ะ → เพิ่มชั้น)',
      );
    }
  }

  /**
   * TODO: Logic สร้างโต๊ะ
   * คำแนะนำตาม backend-coding-standard.md:
   * - ตรวจสอบ error code 23505 (unique_violation) หากชื่อ/เลขโต๊ะซ้ำ แล้ว throw ConflictException
   */
  async create(createTableDto: CreateTableDto) {
    // โต๊ะต้องผูกกับชั้นที่มีอยู่จริง (floor_id) — ไม่ส่งมา = error ชัด ๆ ไม่เดาค่าให้
    if (!createTableDto.floorId) {
      throw new BadRequestException(
        'ต้องระบุชั้นของโต๊ะ (floorId) — เพิ่มชั้นที่หน้าตั้งค่าโต๊ะก่อน แล้วส่ง floor_id ของชั้นนั้น',
      );
    }
    // ชั้นต้องมีอยู่ก่อน — ถ้าข้ามตรงนี้ โต๊ะจะลอยอยู่ชั้นที่ไม่มีในระบบ แล้วหน้าตั้งค่าจะหาไม่เจอ
    await this.assertFloorExists(createTableDto.floorId);

    try {
      const result = await this.tablesRepository.createTable(
        createTableDto.tableNumber,
        createTableDto.capacity,
        createTableDto.floorId,
      );
      return {
        status: 'success',
        data: result,
      };
    }
    catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictException('หมายเลขนี้ซ้ำกับโต๊ะอื่นในร้าน')
      }
      if (err.code === '42P01') {
        throw new InternalServerErrorException(FLOORS_MIGRATION_HINT);
      }
      throw err;
    }
    // TODO: เรียก tablesRepository.createTable และจัดการ Error handling
  }

  /**
   * TODO: ดึงรายการผังโต๊ะทั้งหมด
   */
  async findAll() {
    const rows = await this.tablesRepository.findAll();
    return {
      status: 'success',
      data: rows.map((r: any) => ({
        table_id: r.table_id,
        table_number: r.table_number,
        capacity: r.capacity,
        floor_id: r.floor_id,
        floor_no: r.floor_no ?? null,
        status: r.status,
        created_at: r.created_at,
        updated_at: r.updated_at,
        open_order_id: r.open_order_id ?? null,
        item_count: Number(r.item_count),
        total_amount: Number(r.total_amount),
      })),
    };
  }

  /**
   * TODO: ดึงข้อมูลโต๊ะตาม ID
   * คำแนะนำ:
   * - หากไม่พบข้อมูล ให้ throw NotFoundException('ไม่พบข้อมูลโต๊ะ')
   */
  async findOne(id: string) {
    const result = await this.tablesRepository.findById(id)

    if (!result) {
      throw new NotFoundException('ไม่พบข้อมูลโต๊ะ')
    }
    // TODO: เรียก tablesRepository.findById
    return result;
  }

  /**
   * TODO: แก้ไขข้อมูลโต๊ะ (เลขโต๊ะ, ความจุ, ชั้น)
   */
  async update(id: string, updateTableDto: UpdateTableDto) {
    // ย้ายโต๊ะไปชั้นใหม่ = ชั้นนั้นต้องถูกเพิ่มไว้ก่อนเสมอ
    if (updateTableDto.floorId !== undefined) {
      await this.assertFloorExists(updateTableDto.floorId);
    }

    try {
      const result = await this.tablesRepository.updateTable(id, updateTableDto);

      if (!result) {
        throw new NotFoundException('ไม่พบข้อมูลโต๊ะที่ต้องแก้ไข')
      }

      return {
        status: 'success',
        data: result,
      };
    }
    catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictException('หมายเลขนี้ซ้ำกับโต๊ะอื่นในร้าน')
      }
      throw err;
    }
    // TODO: เรียก tablesRepository.updateTable
  }

  /**
   * TODO: ปรับสถานะเปิด/ปิดการใช้งานโต๊ะ (is_active)
   */
  async setStatus(id: string, isActive: boolean) {
    try {
      const result = await this.tablesRepository.setActiveStatus(id, isActive)
      if (!result) {
        throw new NotFoundException('ไม่พบข้อมูลโต๊ะ');
      }
      return {
        status: 'success',
        data: result,
      };
    } catch (err: any) {
      if (err.message?.includes('active order') || err.message?.includes('TBL-03')) {
        throw new ConflictException('ไม่สามารถปิดการใช้งานโต๊ะที่ยังมีออเดอร์ค้างอยู่ได้');
      }
      throw err;
    }
  }
}
