import { Pencil, UserX, UserCheck } from 'lucide-react';
import type { AppUser } from '../types/user.types';
import { ROLE_LABEL } from '../types/user.types';

interface Props {
    users: AppUser[];
    currentUserId?: string;                                  // ผู้ใช้ที่ล็อกอินอยู่ (กันกดปิดบัญชีตัวเอง)
    onEdit: (user: AppUser) => void;
    onToggleActive: (user: AppUser) => void;
    isSubmitting: boolean;
}

// สีของป้ายตำแหน่ง
const ROLE_BADGE: Record<AppUser['role_name'], string> = {
    owner: 'bg-amber-100 text-amber-800',
    manager: 'bg-sky-100 text-sky-800',
    employee: 'bg-stone-100 text-stone-700',
};

function formatDate(value: string | null) {
    if (!value) return '-';
    return new Date(value).toLocaleString('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function UserTable({ users, currentUserId, onEdit, onToggleActive, isSubmitting }: Props) {
    if (users.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-[#d9c6b0] bg-white/60 p-12 text-center font-kanit">
                <p className="text-sm text-stone-500">ยังไม่มีผู้ใช้ในร้าน</p>
            </div>
        );
    }

    return (
        <div className="font-kanit">
            {/* ── Desktop View (md ขึ้นไป): ตาราง 7 คอลัมน์เดิม 100% ── */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#E8DFD5] bg-white shadow-2xs">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-[#E8DFD5] text-stone-500">
                        <tr>
                            <th className="px-4 py-3 font-medium">ชื่อ-นามสกุล</th>
                            <th className="px-4 py-3 font-medium">ชื่อผู้ใช้</th>
                            <th className="px-4 py-3 font-medium">ตำแหน่ง</th>
                            <th className="px-4 py-3 font-medium">สถานะ</th>
                            <th className="px-4 py-3 font-medium">สถานะ Pin</th>
                            <th className="px-4 py-3 font-medium">เข้าสู่ระบบล่าสุด</th>
                            <th className="px-4 py-3 text-right font-medium">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => {
                            const isSelf = user.user_id === currentUserId;
                            return (
                                <tr
                                    key={user.user_id}
                                    className={`border-b border-[#F0EAE2] last:border-0 ${user.is_active ? '' : 'bg-stone-50/70'}`}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-[#2D241E]">{user.display_name}</span>
                                            {isSelf && (
                                                <span className="rounded-full bg-[#EFE8DC] px-2 py-0.5 text-[11px] text-[#8C6D58]">
                                                    ฉัน
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-stone-600">{user.username}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_BADGE[user.role_name]}`}>
                                            {ROLE_LABEL[user.role_name]}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {user.is_active ? (
                                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                                                ใช้งานอยู่
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-stone-200 px-2.5 py-1 text-xs font-medium text-stone-600">
                                                ปิดใช้งาน
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {user.has_pin ? (
                                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">ตั้งแล้ว</span>
                                        ) : (
                                            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-500">ยังไม่ตั้ง</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-stone-500">{formatDate(user.last_login_at)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                type="button"
                                                onClick={() => onEdit(user)}
                                                disabled={isSubmitting}
                                                title="แก้ไขข้อมูล"
                                                className="flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-stone-600 transition enabled:hover:bg-[#FAF7F2] enabled:hover:text-[#8C6D58] disabled:opacity-50"
                                            >
                                                <Pencil size={15} />
                                                แก้ไข
                                            </button>

                                            {/* ปิดบัญชีตัวเองไม่ได้ และบัญชีเจ้าของร้านปิดไม่ได้ — backend บล็อกไว้อีกชั้น */}
                                            {!isSelf && user.role_name !== 'owner' && (
                                                <button
                                                    type="button"
                                                    onClick={() => onToggleActive(user)}
                                                    disabled={isSubmitting}
                                                    title={user.is_active ? 'ปิดใช้งานบัญชี' : 'เปิดใช้งานบัญชี'}
                                                    className={`flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 transition disabled:opacity-50 ${
                                                        user.is_active
                                                            ? 'text-rose-600 enabled:hover:bg-rose-50'
                                                            : 'text-emerald-700 enabled:hover:bg-emerald-50'
                                                    }`}
                                                >
                                                    {user.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
                                                    {user.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ── Mobile View (< md): การ์ดแสดงข้อมูลผู้ใช้ สวยงาม สบายตา ไม่เบียด ── */}
            <div className="md:hidden space-y-3">
                {users.map((user) => {
                    const isSelf = user.user_id === currentUserId;
                    return (
                        <div
                            key={user.user_id}
                            className={`rounded-2xl border border-[#E8DFD5] bg-white p-4 shadow-2xs space-y-3 ${
                                user.is_active ? '' : 'bg-stone-50/70'
                            }`}
                        >
                            {/* แถวบน: ชื่อ-นามสกุล + ป้ายตำแหน่ง */}
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-semibold text-base text-[#2D241E] truncate">
                                            {user.display_name}
                                        </span>
                                        {isSelf && (
                                            <span className="rounded-full bg-[#EFE8DC] px-2 py-0.5 text-[10px] font-semibold text-[#8C6D58]">
                                                ฉัน
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-stone-500 font-normal mt-0.5 flex items-center gap-1">
                                        <span className="text-stone-400">ชื่อผู้ใช้:</span>
                                        <span className="font-medium text-stone-700">@{user.username}</span>
                                    </p>
                                </div>
                                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE[user.role_name]}`}>
                                    {ROLE_LABEL[user.role_name]}
                                </span>
                            </div>

                            {/* แถวกลาง: ป้ายสถานะต่างๆ */}
                            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#F0EAE2] text-xs">
                                {user.is_active ? (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                                        ใช้งานอยู่
                                    </span>
                                ) : (
                                    <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                                        ปิดใช้งาน
                                    </span>
                                )}

                                {user.has_pin ? (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                                        PIN: ตั้งแล้ว
                                    </span>
                                ) : (
                                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                                        PIN: ยังไม่ตั้ง
                                    </span>
                                )}

                                <span className="text-stone-400 text-[11px] ml-auto">
                                    เข้าสู่ระบบ: {formatDate(user.last_login_at)}
                                </span>
                            </div>

                            {/* แถวล่าง: ปุ่มจัดการ (แก้ไข / ปิดใช้งาน) */}
                            <div className="flex items-center gap-2 pt-2 border-t border-[#F0EAE2]">
                                <button
                                    type="button"
                                    onClick={() => onEdit(user)}
                                    disabled={isSubmitting}
                                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#d9c6b0] bg-white py-2 text-xs font-semibold text-stone-700 hover:bg-[#FAF7F2] active:scale-95 transition cursor-pointer disabled:opacity-50"
                                >
                                    <Pencil size={14} />
                                    <span>แก้ไข</span>
                                </button>

                                {!isSelf && user.role_name !== 'owner' && (
                                    <button
                                        type="button"
                                        onClick={() => onToggleActive(user)}
                                        disabled={isSubmitting}
                                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition active:scale-95 cursor-pointer disabled:opacity-50 ${
                                            user.is_active
                                                ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                                : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                        }`}
                                    >
                                        {user.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                                        <span>{user.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
