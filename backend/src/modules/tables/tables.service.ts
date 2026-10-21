import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TablesRepository } from './tables.repository';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

@Injectable()
export class TablesService {
  constructor(private readonly tablesRepository: TablesRepository) { }

  /**
   * TODO: Logic สร้างโต๊ะ
   * คำแนะนำตาม backend-coding-standard.md:
   * - ตรวจสอบ error code 23505 (unique_violation) หากชื่อ/เลขโต๊ะซ้ำ แล้ว throw ConflictException
   */
  async create(createTableDto: CreateTableDto) {

    try {
      const result = await this.tablesRepository.createTable(createTableDto.tableNumber, createTableDto.capacity, createTableDto.floor ?? 1,);
      return {
        status: 'success',
        data: result,
      };
    }
    catch (err: any) {
      if (err.code === '23505') {
        throw new ConflictException('ชื่อซ้ำ')
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
        floor: r.floor,
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
        throw new ConflictException('ชื่อซ้ำ')
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
