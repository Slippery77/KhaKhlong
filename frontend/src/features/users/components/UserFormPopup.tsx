import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { AppUser, AssignableRole, UserFormValues } from '../types/user.types';
import { ASSIGNABLE_ROLES, ROLE_LABEL } from '../types/user.types';

interface Props {
    user?: AppUser;                                              // มี = โหมดแก้ไข, ไม่มี = โหมดเพิ่ม
    onSubmit: (values: UserFormValues) => Promise<boolean>;       // true = สำเร็จ → ปิด popup
    onClose: () => void;
    isSubmitting: boolean;
    error: string | null;
}

const MIN_PASSWORD_LENGTH = 8;

export default function UserFormPopup({ user, onSubmit, onClose, isSubmitting, error }: Props) {
    const isEdit = user !== undefined;
    // บัญชีเจ้าของร้านเปลี่ยนตำแหน่งไม่ได้ (backend บล็อกไว้) — ล็อก dropdown ไว้
    const isOwner = user?.role_name === 'owner';

    // ตอนแก้ไข: เติมค่าเดิมกลับเข้าฟอร์ม ยกเว้นรหัสผ่าน (ไม่มีค่าเดิมให้เติม)
    const [displayName, setDisplayName] = useState(user?.display_name ?? '');
    const [username, setUsername] = useState(user?.username ?? '');
    const [role, setRole] = useState<AssignableRole>(
        user && user.role_name !== 'owner' ? user.role_name : 'employee',
    );
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // ตรวจในฟอร์มก่อนยิง API — ข้อความภาษาไทยเข้าใจง่ายกว่า error จาก server
    const [touched, setTouched] = useState(false);

    const displayNameError = displayName.trim() === '' ? 'กรุณากรอกชื่อ-นามสกุล' : null;
    const usernameError = username.trim() === '' ? 'กรุณากรอกชื่อผู้ใช้' : null;
    const passwordError = isEdit && password === ''
        ? null
        : password.length < MIN_PASSWORD_LENGTH
            ? `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`
            : null;
    const confirmError = confirmPassword !== password
        ? 'รหัสผ่านทั้งสองช่องไม่ตรงกัน'
        : null;

    const canSubmit = !displayNameError && !usernameError && !passwordError && !confirmError && !isSubmitting;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(true);
        if (!canSubmit) return;

        const ok = await onSubmit({
            display_name: displayName.trim(),
            username: username.trim(),
            // บัญชีเจ้าของร้านไม่ส่ง role_name ไป (backend ไม่ให้เปลี่ยนตำแหน่งของ owner)
            role_name: isOwner ? undefined : role,
            password,
            confirm_password: confirmPassword,
        });
        if (ok) {
            onClose();
        }
    };

    // แสดงข้อความผิดพลาดต่อช่องก็ต่อเมื่อผู้ใช้เคยแตะช่องนั้นแล้ว
    const showError = (value: string | null) => (touched && value ? value : null);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
                <h2 className="mb-1 text-lg font-semibold text-[#2D241E]">
                    {isEdit ? 'แก้ไขบัญชีผู้ใช้' : 'เพิ่มบัญชีผู้ใช้'}
                </h2>
                <p className="mb-4 text-xs text-stone-500">
                    {isEdit
                        ? 'เว้นว่างในช่องรหัสผ่าน = ไม่เปลี่ยนรหัสผ่านเดิม'
                        : 'ผู้ใช้ใหม่จะใช้ชื่อผู้ใช้และรหัสผ่านนี้เข้าสู่ระบบ'}
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1 text-sm text-stone-600">
                        ชื่อ-นามสกุล
                        <input
                            autoFocus
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            onBlur={() => setTouched(true)}
                            maxLength={100}
                            placeholder="เช่น สมชาย ใจดี"
                            className="rounded-xl border border-[#d9c6b0] px-3 py-2 text-[#2D241E] outline-none focus:border-[#8C6D58]"
                        />
                        {showError(displayNameError) && (
                            <span className="text-xs text-red-600">{displayNameError}</span>
                        )}
                    </label>

                    <label className="flex flex-col gap-1 text-sm text-stone-600">
                        ชื่อผู้ใช้
                        <input
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            onBlur={() => setTouched(true)}
                            maxLength={100}
                            autoComplete="off"
                            placeholder="เช่น somchai"
                            className="rounded-xl border border-[#d9c6b0] px-3 py-2 text-[#2D241E] outline-none focus:border-[#8C6D58]"
                        />
                        {showError(usernameError) && (
                            <span className="text-xs text-red-600">{usernameError}</span>
                        )}
                    </label>

                    <label className="flex flex-col gap-1 text-sm text-stone-600">
                        ตำแหน่ง
                        {isOwner ? (
                            <>
                                <input
                                    value={ROLE_LABEL.owner}
                                    readOnly
                                    className="rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2 text-[#8C6D58]"
                                />
                                <span className="text-xs text-stone-400">
                                    ตำแหน่งของเจ้าของร้านเปลี่ยนไม่ได้
                                </span>
                            </>
                        ) : (
                            <select
                                value={role}
                                onChange={e => setRole(e.target.value as AssignableRole)}
                                className="rounded-xl border border-[#d9c6b0] bg-white px-3 py-2 text-[#2D241E] outline-none focus:border-[#8C6D58]"
                            >
                                {ASSIGNABLE_ROLES.map(r => (
                                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                                ))}
                            </select>
                        )}
                    </label>

                    <label className="flex flex-col gap-1 text-sm text-stone-600">
                        รหัสผ่าน{isEdit && ' (ไม่บังคับ)'}
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onBlur={() => setTouched(true)}
                                maxLength={72}
                                autoComplete="new-password"
                                placeholder={`อย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`}
                                className="w-full rounded-xl border border-[#d9c6b0] px-3 py-2 pr-10 text-[#2D241E] outline-none focus:border-[#8C6D58]"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-1 text-stone-400 transition hover:bg-[#FAF7F2] hover:text-stone-600"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {showError(passwordError) && (
                            <span className="text-xs text-red-600">{passwordError}</span>
                        )}
                    </label>

                    <label className="flex flex-col gap-1 text-sm text-stone-600">
                        ยืนยันรหัสผ่าน{isEdit && ' (ไม่บังคับ)'}
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            onBlur={() => setTouched(true)}
                            maxLength={72}
                            autoComplete="new-password"
                            placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                            className="rounded-xl border border-[#d9c6b0] px-3 py-2 text-[#2D241E] outline-none focus:border-[#8C6D58]"
                        />
                        {showError(confirmError) && (
                            <span className="text-xs text-red-600">{confirmError}</span>
                        )}
                    </label>

                    {error && <p className="text-xs text-red-600">{error}</p>}

                    <div className="mt-1 flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 rounded-xl border border-[#d9c6b0] py-2 text-[#2D241E] transition enabled:hover:bg-[#FAF7F2] enabled:active:scale-95 disabled:opacity-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="flex-1 rounded-xl bg-[#8C6D58] py-2 font-semibold text-white transition enabled:hover:bg-[#7a5c45] enabled:active:scale-95 disabled:opacity-50"
                        >
                            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
