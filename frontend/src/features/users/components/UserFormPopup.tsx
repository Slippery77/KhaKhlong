import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { AppUser, AssignableRole, UserFormValues } from '../types/user.types';
import { ASSIGNABLE_ROLES, ROLE_LABEL } from '../types/user.types';
import { PinInput } from '../../registerOwner/components/PinInput';

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
    const [pin, setPin] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // ตรวจในฟอร์มก่อนยิง API — ข้อความภาษาไทยเข้าใจง่ายกว่า error จาก server
    const [touched, setTouched] = useState(false);

    const displayNameError = displayName.trim() === '' ? 'กรุณากรอกชื่อ-นามสกุล' : null;
    const usernameError = username.trim() === '' ? 'กรุณากรอกชื่อผู้ใช้' : null;
    // PIN ไม่บังคับ แต่ถ้ากรอกต้องครบ 6 หลัก
    const pinError = pin !== '' && !/^\d{6}$/.test(pin) ? 'กรุณากรอก PIN ให้ครบ 6 หลัก' : null;
    const passwordError = isEdit && password === ''
        ? null
        : password.length < MIN_PASSWORD_LENGTH
            ? `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`
            : null;
    const confirmError = confirmPassword !== password
        ? 'รหัสผ่านทั้งสองช่องไม่ตรงกัน'
        : null;

    const canSubmit = !displayNameError && !usernameError && !pinError && !passwordError && !confirmError && !isSubmitting;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched(true);
        if (!canSubmit) return;

        const ok = await onSubmit({
            display_name: displayName.trim(),
            username: username.trim(),
            // บัญชีเจ้าของร้านไม่ส่ง role_name ไป (backend ไม่ให้เปลี่ยนตำแหน่งของ owner)
            role_name: isOwner ? undefined : role,
            pin,
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
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto backdrop-blur-xs font-kanit animate-in fade-in duration-150"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) onClose();
            }}
        >
            <div className="relative w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl my-auto max-h-[92dvh] sm:max-h-none flex flex-col overflow-hidden sm:overflow-visible animate-in zoom-in-95 duration-150">
                <div className="shrink-0 mb-3">
                    <h2 className="text-lg font-semibold text-[#2D241E]">
                        {isEdit ? 'แก้ไขบัญชีผู้ใช้' : 'เพิ่มบัญชีผู้ใช้'}
                    </h2>
                    <p className="mt-0.5 text-xs text-stone-500">
                        {isEdit
                            ? 'เว้นว่างในช่องรหัสผ่าน = ไม่เปลี่ยนรหัสผ่านเดิม'
                            : 'ผู้ใช้ใหม่จะใช้ชื่อผู้ใช้และรหัสผ่านนี้เข้าสู่ระบบ'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto sm:overflow-visible pr-1 sm:pr-0 flex flex-col gap-3 min-h-0">
                    <div className="flex flex-col gap-1 text-sm text-stone-600">
                        <label htmlFor="user-display-name">ชื่อ-นามสกุล</label>
                        <input
                            id="user-display-name"
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
                    </div>

                    <div className="flex flex-col gap-1 text-sm text-stone-600">
                        <label htmlFor="user-username">ชื่อผู้ใช้</label>
                        <input
                            id="user-username"
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
                    </div>

                    <div className="flex flex-col gap-1 text-sm text-stone-600">
                        <label htmlFor="user-role">ตำแหน่ง</label>
                        {isOwner ? (
                            <>
                                <input
                                    id="user-role"
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
                                id="user-role"
                                value={role}
                                onChange={e => setRole(e.target.value as AssignableRole)}
                                className="rounded-xl border border-[#d9c6b0] bg-white px-3 py-2 text-[#2D241E] outline-none focus:border-[#8C6D58]"
                            >
                                {ASSIGNABLE_ROLES.map(r => (
                                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="flex flex-col gap-1 text-sm text-stone-600">
                        <label htmlFor="user-pin">
                            PIN 6 หลัก (ไม่บังคับ)
                        </label>
                        <div className="flex w-full justify-center py-1">
                            <PinInput
                                id="user-pin"
                                value={pin}
                                onChange={setPin}
                                hasError={!!showError(pinError)}
                                disabled={isSubmitting}
                            />
                        </div>
                        {showError(pinError) ? (
                            <span className="text-xs text-center text-red-600">{pinError}</span>
                        ) : (
                            <span className="text-xs text-center text-stone-400">
                                {isEdit ? 'เว้นว่าง = ไม่เปลี่ยน PIN เดิม' : 'ใช้สลับผู้ใช้ที่หน้าร้าน'}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-1 text-sm text-stone-600">
                        <label htmlFor="user-password">รหัสผ่าน{isEdit && ' (ไม่บังคับ)'}</label>
                        {/* Flex Input Group: Input และปุ่มดวงตาอยู่ใน Flow เดียวกัน ไม่ใช้ position: absolute ป้องกันดวงตาลอย 100% */}
                        <div className="flex items-center w-full rounded-xl border border-[#d9c6b0] bg-white px-3 py-2 focus-within:border-[#8C6D58] focus-within:ring-2 focus-within:ring-[#8C6D58]/10 transition-colors">
                            <input
                                id="user-password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onBlur={() => setTouched(true)}
                                maxLength={72}
                                autoComplete="new-password"
                                placeholder={`อย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`}
                                className="w-full flex-1 border-0 bg-transparent p-0 text-[#2D241E] outline-none focus:outline-none placeholder:text-stone-400 text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                                className="ml-1.5 shrink-0 cursor-pointer rounded-lg p-1 text-stone-400 transition hover:bg-[#FAF7F2] hover:text-stone-600"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {showError(passwordError) && (
                            <span className="text-xs text-red-600">{passwordError}</span>
                        )}
                    </div>

                    <div className="flex flex-col gap-1 text-sm text-stone-600">
                        <label htmlFor="user-confirm-password">ยืนยันรหัสผ่าน{isEdit && ' (ไม่บังคับ)'}</label>
                        {/* Flex Input Group: Input และปุ่มดวงตาอยู่ใน Flow เดียวกัน */}
                        <div className="flex items-center w-full rounded-xl border border-[#d9c6b0] bg-white px-3 py-2 focus-within:border-[#8C6D58] focus-within:ring-2 focus-within:ring-[#8C6D58]/10 transition-colors">
                            <input
                                id="user-confirm-password"
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                onBlur={() => setTouched(true)}
                                maxLength={72}
                                autoComplete="new-password"
                                placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                                className="w-full flex-1 border-0 bg-transparent p-0 text-[#2D241E] outline-none focus:outline-none placeholder:text-stone-400 text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                                className="ml-1.5 shrink-0 cursor-pointer rounded-lg p-1 text-stone-400 transition hover:bg-[#FAF7F2] hover:text-stone-600"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {showError(confirmError) && (
                            <span className="text-xs text-red-600">{confirmError}</span>
                        )}
                    </div>

                    {error && <p className="text-xs text-red-600">{error}</p>}

                    <div className="mt-2 flex gap-2 shrink-0 pt-2 border-t border-stone-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 rounded-xl border border-[#d9c6b0] py-2.5 text-sm font-medium text-[#2D241E] transition enabled:hover:bg-[#FAF7F2] enabled:active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="flex-1 rounded-xl bg-[#8C6D58] py-2.5 text-sm font-semibold text-white transition enabled:hover:bg-[#7a5c45] enabled:active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
