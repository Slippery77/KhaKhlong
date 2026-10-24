import { Injectable } from '@nestjs/common';
import { DbContextService } from '../../database/db-context.service';

const FLOOR_COLS = `
    floor_id,
    floor_no,
    name,
    table_count,
    created_at,
    updated_at
`;

/** ค่าที่ PATCH /floors/:id ต้องการเปลี่ยน (undefined = ไม่แตะช่องนั้น) */
export interface FloorPatch {
    floor_no?: number;
    name?: string | null;
    table_count?: number;
}

@Injectable()
export class FloorsRepository {
    constructor(private readonly db: DbContextService) {}

    /**
     * รายชื่อชั้นทั้งหมดของร้าน + จำนวนโต๊ะที่มีจริงในแต่ละชั้น
     * RLS กรอง tenant ให้อยู่แล้ว แต่ใส่เงื่อนไขซ้ำไว้กันเหนียว (ตามแนวโค้ดโปรเจกต์)
     */
    async findAll() {
        const sql = `
            SELECT
                ${FLOOR_COLS},
                (SELECT COUNT(*) FROM dining_tables t
                  WHERE t.floor_id = f.floor_id)::int AS actual_table_count
            FROM floors f
            WHERE f.tenant_id = app_tenant_id()
            ORDER BY f.floor_no ASC;
        `;
        const result = await this.db.query(sql);
        return result.rows;
    }

    async findById(floorId: string) {
        const sql = `
            SELECT ${FLOOR_COLS}
            FROM floors f
            WHERE f.floor_id = $1 AND f.tenant_id = app_tenant_id();
        `;
        const result = await this.db.query(sql, [floorId]);
        return result.rows[0] ?? null;
    }

    /** ใช้ตอนเช็คว่าชั้นยังมีโต๊ะอยู่ไหมก่อนลบ */
    async findFloorNo(floorNo: number) {
        const sql = `
            SELECT floor_id, floor_no
            FROM floors
            WHERE tenant_id = app_tenant_id() AND floor_no = $1;
        `;
        const result = await this.db.query(sql, [floorNo]);
        return result.rows[0] ?? null;
    }

    async create(floorNo: number, name: string | null, tableCount: number) {
        const sql = `
            INSERT INTO floors (tenant_id, floor_no, name, table_count)
            VALUES (app_tenant_id(), $1, $2, $3)
            RETURNING ${FLOOR_COLS};
        `;
        const result = await this.db.query(sql, [floorNo, name, tableCount]);
        return result.rows[0];
    }

    /**
     * อัปเดตแบบเลือกช่อง — สร้าง SET จาก field ที่ส่งมาเท่านั้น
     * (name ส่ง null ได้ = ล้างชื่อ ต่างจากไม่ส่งซึ่งแปลว่าไม่แตะ)
     */
    async update(floorId: string, patch: FloorPatch) {
        const sets: string[] = [];
        const params: unknown[] = [];
        const set = (column: string, value: unknown) => {
            params.push(value);
            sets.push(`${column} = $${params.length}`);
        };

        if (patch.floor_no !== undefined) set('floor_no', patch.floor_no);
        if (patch.name !== undefined) set('name', patch.name);
        if (patch.table_count !== undefined) set('table_count', patch.table_count);

        if (sets.length === 0) return null;

        params.push(floorId);
        const sql = `
            UPDATE floors
            SET ${sets.join(', ')}
            WHERE floor_id = $${params.length} AND tenant_id = app_tenant_id()
            RETURNING ${FLOOR_COLS};
        `;
        const result = await this.db.query(sql, params);
        return result.rows[0] ?? null;
    }

    /** จำนวนโต๊ะที่อยู่ในชั้นนี้จริง — ใช้ตอนจะลบชั้น (ลบได้เฉพาะชั้นว่าง) */
    async countTables(floorId: string) {
        const sql = `
            SELECT COUNT(*)::int AS count
            FROM dining_tables
            WHERE tenant_id = app_tenant_id() AND floor_id = $1;
        `;
        const result = await this.db.query(sql, [floorId]);
        return result.rows[0].count as number;
    }

    async remove(floorId: string) {
        const sql = `
            DELETE FROM floors
            WHERE floor_id = $1 AND tenant_id = app_tenant_id()
            RETURNING floor_id;
        `;
        const result = await this.db.query(sql, [floorId]);
        return result.rows[0] ?? null;
    }
}
