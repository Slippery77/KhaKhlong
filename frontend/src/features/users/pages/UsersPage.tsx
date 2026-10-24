import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import Header from '../../../components/Header';
import SettingNavBar from '../../../components/settingNavBar';
import { useAuth } from '../../auth/context/AuthContext';
import { useUserActions, useUsersList } from '../hooks/useUsers';
import UserFormPopup from '../components/UserFormPopup';
import UserTable from '../components/UserTable';
import ConfirmDialog from '../components/ConfirmDialog';
import type { AppUser, UserFormValues } from '../types/user.types';
import { ROLE_LABEL } from '../types/user.types';

export default function UsersPage() {
    const { users, isLoading, error, reload } = useUsersList();
    const { createUser, updateUser, setUserActive, isSubmitting, error: actionError, clearError } = useUserActions();
    const { user: currentUser } = useAuth();

    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [formUser, setFormUser] = useState<AppUser | undefined>(undefined);
    const [confirmTarget, setConfirmTarget] = useState<AppUser | null>(null);

    // กรองรายชื่อด้วยคำค้น — จับได้ทั้งชื่อผู้ใช้และชื่อ-นามสกุล
    const filtered = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return users;
        return users.filter(
            u =>
                u.username.toLowerCase().includes(keyword) ||
                u.display_name.toLowerCase().includes(keyword) ||
                ROLE_LABEL[u.role_name].toLowerCase().includes(keyword),
        );
    }, [users, search]);

    const activeCount = users.filter(u => u.is_active).length;
    const inactiveCount = users.length - activeCount;

    const handleSubmit = async (values: UserFormValues) => {
        const ok = formUser
            ? await updateUser(formUser.user_id, values)
            : await createUser(values);
        if (ok) {
            await reload(true);
        }
        return ok;
    };

    const handleToggleActive = async () => {
        if (!confirmTarget) return;
        const ok = await setUserActive(confirmTarget.user_id, !confirmTarget.is_active);
        if (ok) {
            await reload(true);
        }
        setConfirmTarget(null);
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

    if (isLoading) {
        return (
            <div className="flex h-dvh flex-col font-kanit">
                <Header />
                <SettingNavBar />
                <main className="flex-1 bg-[#FAF7F2] p-6">
                    <p className="text-sm text-stone-500">กำลังโหลดข้อมูลผู้ใช้...</p>
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-dvh flex-col font-kanit">
            <Header />
            <SettingNavBar />

            <main className="flex-1 overflow-y-auto bg-[#FAF7F2] p-6">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-[#2D241E]">บัญชีผู้ใช้</h1>
                        <p className="text-sm text-stone-500">
                            ทั้งหมด {users.length} คน · ใช้งานอยู่ {activeCount} · ปิดใช้งาน {inactiveCount}
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
                            onClick={openCreateForm}
                            className="flex cursor-pointer items-center gap-1 rounded-xl bg-[#8C6D58] px-4 py-2 font-semibold text-white transition hover:bg-[#7a5c45] active:scale-95"
                        >
                            <Plus size={18} />
                            เพิ่มบัญชีผู้ใช้
                        </button>
                    </div>
                </div>

                {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

                <UserTable
                    users={filtered}
                    currentUserId={currentUser?.sub}
                    onEdit={openEditForm}
                    onToggleActive={setConfirmTarget}
                    isSubmitting={isSubmitting}
                />

                {showForm && (
                    <UserFormPopup
                        user={formUser}
                        onSubmit={handleSubmit}
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
        </div>
    );
}
