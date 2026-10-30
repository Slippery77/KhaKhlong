import { Injectable, Inject, InternalServerErrorException } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { Pool, PoolClient, QueryResultRow } from 'pg';
import { PG_POOL } from './database.constants';

// ข้อมูลที่ผูกกับ request หนึ่ง ๆ
export interface DbStore {
    client: PoolClient;
}

// ข้อมูลตัวตนที่ต้องบอกฐานข้อมูล
export interface TenantContext {
    tenantId: string;
    userId: string | null;
    role: string | null;
    clientIp: string;
    deviceInfo: string;
}

@Injectable()
export class DbContextService {
    // กล่องประจำ request — ตัวนี้แหละคือ AsyncLocalStorage
    private readonly als = new AsyncLocalStorage<DbStore>();

    constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

    /** ตอนนี้อยู่ใน transaction ที่มี context อยู่แล้วหรือไม่ */
    get inTransaction(): boolean{
        return this.als.getStore() !== undefined;
    }
    /**
     * client ของ request ปัจจุบัน
     * ถ้าไม่มี แปลว่าโค้ดนี้ถูกเรียกนอก request ที่มี context
     * ให้พังทันทีดีกว่าปล่อยให้ query คืน array ว่างแล้วไล่หาสาเหตุไม่เจอ
     */
    get client(): PoolClient {
        const store = this.als.getStore();
        if (!store) {
            throw new InternalServerErrorException(
                'ไม่มี tenant context — route นี้ต้องผ่าน TenantContextInterceptor ก่อน',
            );
        }
        return store.client;
    }

    /** ใช้แทน this.pool.query() เดิมใน repository */
    query<T extends QueryResultRow = any>(sql: string, params?: any[]) {
        return this.client.query<T>(sql, params);
    }
    /**
     * ใช้ได้เฉพาะตารางที่ไม่มี tenant_id และไม่มี RLS
     * ปัจจุบันมี 4 ตาราง: roles, permissions, role_permissions, config_definitions
     *
     * เหตุที่ต้องมี: งานตอน boot เช่น PermissionCacheService.onModuleInit
     * ยังไม่มี request จึงยังไม่มี context แต่ต้องอ่านข้อมูลกลางพวกนี้
     *
     * อนุญาตเพิ่มอีกกรณีเดียว: ฟังก์ชันระบบที่เป็น SECURITY DEFINER และตั้งใจ
     * ทำงานข้าม tenant ด้วยตัวเอง (เช่น escalate_overdue_shifts()) — cron ไม่มี
     * request จนไม่มี context ให้ตั้ง RLS
     *
     * ห้ามใช้กับตารางที่มี tenant_id เด็ดขาด — RLS จะคืน 0 แถวแบบเงียบ
     * ไม่ throw ไม่เตือน ทำให้ bug ซ่อนตัว
     */
    referenceQuery<T extends QueryResultRow = any>(sql: string, params?: any[]) {
        // ถ้าเผอิญอยู่ใน request อยู่แล้ว ใช้ client เดิม ไม่เปิด connection ใหม่เปล่า ๆ
        if (this.inTransaction) {
            return this.client.query<T>(sql, params);
        }
        return this.pool.query<T>(sql, params);
    }

    /**
     * เขียนแบบ "แยกธุรกรรม" — commit ทันที ไม่ว่า request หลักจะ rollback ภายหลัง
     *
     * ใช้กับตัวนับด้านความปลอดภัย (เช่น นับ PIN ผิด) ที่ต้องคงอยู่จริง
     * ถ้าเขียนใน transaction ของ request แล้วโยน error เพื่อปฏิเสธคำขอ
     * ตัวนับจะถูก rollback หายไปด้วย = ล็อกไม่ได้เลย
     *
     * หมายเหตุ: ดึง tenant จาก connection ของ request ปัจจุบันเพื่อตั้ง RLS ให้เหมือนเดิม
     * ห้ามใช้กับงานธุรกิจปกติ (void/comp/ชำระเงิน) — พวกนั้นต้อง rollback ได้
     */
    async durableQuery<T extends QueryResultRow = any>(sql: string, params?: any[]) {
        const store = this.als.getStore();
        let tenantId = '';
        if (store) {
            const ctx = await store.client.query<{ tid: string | null }>(
                `SELECT NULLIF(current_setting('app.current_tenant_id', true), '') AS tid`,
            );
            tenantId = ctx.rows[0]?.tid ?? '';
        }

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            if (tenantId) {
                await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId]);
            }
            const result = await client.query<T>(sql, params);
            await client.query('COMMIT');
            return result;
        } catch (err) {
            await client.query('ROLLBACK').catch(() => undefined);
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * เปิด transaction + ตั้ง context + รันงานข้างใน
     * Interceptor เรียกตัวนี้ และ register ก็เรียกตัวนี้เหมือนกัน
     */
    async runInTransaction<T>(ctx: TenantContext, work: () => Promise<T>): Promise<T> {
        // กันซ้อน: ถ้ามี transaction อยู่แล้ว ใช้ตัวเดิม ไม่เปิดใหม่
        // ถ้าเปิดใหม่จะได้ connection คนละตัว = transaction คนละอัน
        // = rollback ตัวนอกจะไม่ลบงานของตัวใน ข้อมูลครึ่ง ๆ ค้างใน DB
        if (this.inTransaction) {
            return work();
        }
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // หัวใจทั้งหมดอยู่ที่ 5 บรรทัดนี้
            await client.query(
                `SELECT set_config('app.current_tenant_id', $1, true),
                        set_config('app.current_user_id',   $2, true),
                        set_config('app.current_user_role', $3, true),
                        set_config('app.client_ip',         $4, true),
                        set_config('app.device_info',       $5, true)`,
                [ctx.tenantId, ctx.userId ?? '', ctx.role ?? '', ctx.clientIp, ctx.deviceInfo],
            );

            // als.run คือจุดที่ "ใส่สายรัดข้อมือ"
            const result = await this.als.run({ client }, work);

            await client.query('COMMIT');
            return result;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();   // คืน connection เข้า pool เสมอ ไม่ว่าสำเร็จหรือพัง
        }
    }
}