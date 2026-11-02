import { useMemo, useState } from 'react';
import { AlertCircle, Plus, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { useUserActions, useUsersList } from '../hooks/useUsers';
import UserFormPopup from '../components/UserFormPopup';
import UserTable from '../components/UserTable';
import ConfirmDialog from '../components/ConfirmDialog';
import type { AppUser, UserFormValues } from '../types/user.types';
import { ROLE_LABEL } from '../types/user.types';

function UserTableSkeleton() {
    return (
        <div className="overflow-hidden rounded-2xl border border-[#E8DFD5] bg-white shadow-xs" aria-busy="true">
            <div className="border-b border-[#E8DFD5] bg-[#FAF7F2] px-4 py-3">
                <div className="h-4 w-32 rounded bg-stone-200/60 animate-pulse" />
            </div>
            <div className="divide-y divide-[#F0EAE2]">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3.5">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-stone-200/60 animate-pulse" />
                            <div className="space-y-1.5">
                                <div className="h-4 w-28 rounded bg-stone-200/70 animate-pulse" />
                                <div className="h-3 w-20 rounded bg-stone-200/40 animate-pulse" />
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-5 w-16 rounded-full bg-stone-200/60 animate-pulse" />
                            <div className="h-5 w-14 rounded-full bg-stone-200/50 animate-pulse" />
                            <div className="h-7 w-12 rounded-lg bg-stone-200/50 animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function UsersPage() {
    const { users, isLoading, error, reload } = useUsersList();
    const { createUser, updateUser, setUserActive, isSubmitting, error: actionError, clearError } = useUserActions();
    const { user: currentUser } = useAuth();

    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [formUser, setFormUser] = useState<AppUser | undefined>(undefined);
    const [confirmTarget, setConfirmTarget] = useState<AppUser | null>(null);

    const hasData = users.length > 0;
    const isInitialLoading = isLoading && !hasData;

    // กรองรายชื่อด้วยคำค้น — จับได้ทั้งชื่อผู้ใช้และชื่อ-นามสกุล
    const filtered = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return users;
        return users.filter(
            u =>
                u.username.toLowerCase().includes(keyword) ||
                u.display_name.toLowerCase().includes(keyword) ||
                (ROLE_LABEL[u.role_name] ?? u.role_name).toLowerCase().includes(keyword),
        );
    }, [users, search]);

    const activeCount = users.filter(u => u.is_active).length;
    const inactiveCount = users.length - activeCount;

    const handleFormSubmit = async (values: UserFormValues): Promise<boolean> => {
        const ok = formUser ? await updateUser(formUser.user_id, values) : await createUser(values);
        if (ok) {
            setShowForm(false);
            setFormUser(undefined);
            await reload(true);
        }
        return ok;
    };

    const handleToggleActive = async () => {
        if (!confirmTarget) return;
        const ok = await setUserActive(confirmTarget.user_id, !confirmTarget.is_active);
        if (ok) {
            setConfirmTarget(null);
            await reload(true);
        }
    };

    const openCreateForm = () => {
        clearError();
        setFormUser(undefined);
        setShowForm(true);
    };

    const openEditForm = (target: AppUser) => {
        clearError();
        setFormUser(target);
        setShowForm(true);
    };

    return (
        <main className="flex-1 overflow-y-auto bg-[#FAF7F2] p-6 font-kanit">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-[#2D241E]">บัญชีผู้ใช้</h1>
                    <p className="text-sm text-stone-500">
                        {isInitialLoading
                            ? 'กำลังโหลดข้อมูลผู้ใช้...'
                            : `ทั้งหมด ${users.length} คน · ใช้งานอยู่ ${activeCount} · ปิดใช้งาน ${inactiveCount}`}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search
                            size={15}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                        />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="ค้นหาชื่อผู้ใช้"
                            className="w-48 rounded-xl border border-[#d9c6b0] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#8C6D58]"
                        />
                    </div>

                    <button
                        type="button"
                        disabled={isInitialLoading}
                        onClick={openCreateForm}
                        className="flex cursor-pointer items-center gap-1 rounded-xl bg-[#8C6D58] px-4 py-2 font-semibold text-white transition hover:bg-[#7a5c45] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={18} />
                        เพิ่มบัญชีผู้ใช้
                    </button>
                </div>
            </div>

            {error && !hasData && (
                <div className="mb-6 flex max-w-xl items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 shadow-xs">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => reload(false)}
                        className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-xs hover:bg-rose-50 transition active:scale-95"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        ลองใหม่
                    </button>
                </div>
            )}
            {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}

            {isInitialLoading ? (
                <UserTableSkeleton />
            ) : (
                <UserTable
                    users={filtered}
                    currentUserId={currentUser?.sub}
                    onEdit={openEditForm}
                    onToggleActive={setConfirmTarget}
                    isSubmitting={isSubmitting}
                />
            )}

            {showForm && (
                <UserFormPopup
                    user={formUser}
                    onSubmit={handleFormSubmit}
                    onClose={() => setShowForm(false)}
                    isSubmitting={isSubmitting}
                    error={actionError}
                />
            )}

            {confirmTarget && (
                <ConfirmDialog
                    title={confirmTarget.is_active ? 'ปิดใช้งานบัญชีผู้ใช้' : 'เปิดใช้งานบัญชีผู้ใช้'}
                    message={
                        confirmTarget.is_active
                            ? `บัญชี "${confirmTarget.display_name}" จะเข้าสู่ระบบไม่ได้อีกจนกว่าจะเปิดใช้งานกลับ ข้อมูลเดิมยังอยู่ครบ`
                            : `บัญชี "${confirmTarget.display_name}" จะกลับมาใช้งานได้ตามปกติ`
                    }
                    confirmLabel={confirmTarget.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                    danger={confirmTarget.is_active}
                    isSubmitting={isSubmitting}
                    onConfirm={handleToggleActive}
                    onClose={() => setConfirmTarget(null)}
                />
            )}
        </main>
    );
}
