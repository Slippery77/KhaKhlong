import { useState } from "react";
import {
    ArrowLeft,
    UserPlus,
    User,
    Mail,
    Lock,
    Eye,
    EyeOff,
    IdCard,
} from "lucide-react";

export interface RegisterOwnerInfo {
    username: string;
    email: string;
    password: string;
    confirm_password: string;
    display_name?: string;
}

export type RegisterOwnerFormProps = {
    initialValues?: Partial<RegisterOwnerInfo>;
    onNext?: (data: RegisterOwnerInfo) => void;
    /** อยู่ระหว่างส่งข้อมูลสมัครจริง (จากหน้า register_pages) */
    isSubmitting?: boolean;
    /** ข้อผิดพลาดจาก backend เช่น slug/email ซ้ำ */
    submitError?: string | null;
    /** กดย้อนกลับไปขั้นตอนข้อมูลร้าน */
    onBack?: () => void;
};

export function Register_OwnerForm({
    initialValues,
    onNext,
    isSubmitting = false,
    submitError = null,
    onBack,
}: RegisterOwnerFormProps = {}) {
    const [fromState, setFromState] = useState<RegisterOwnerInfo>({
        username: "",
        email: "",
        password: "",
        confirm_password: "",
        display_name: "",
        ...initialValues,
    });
    // แสดง/ซ่อนรหัสผ่าน (ใช้ไอคอน lucide ไม่ใช่ emoji)
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (field: keyof RegisterOwnerInfo, value: string) => {
        setFromState((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const newErrors = {
            username: fromState.username.trim() === "" ? "กรุณากรอกชื่อผู้ใช้" : "",
            email:
                fromState.email.trim() === ""
                    ? "กรุณากรอกอีเมล"
                    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromState.email.trim())
                      ? "รูปแบบอีเมลไม่ถูกต้อง"
                      : "",
            password:
                fromState.password.length < 6
                    ? "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"
                    : "",
            confirm_password:
                fromState.confirm_password !== fromState.password
                    ? "รหัสผ่านไม่ตรงกัน"
                    : "",
        };
        setErrors(newErrors);
        const hasErrors = Object.values(newErrors).some((msg) => msg !== "");
        if (hasErrors) {
            return;
        }
        onNext?.(fromState);
    };

    const inputClass = (field: string) =>
        `h-12 w-full rounded-xl border bg-white px-4 text-[#2D241E] placeholder:text-[#9B8E82] transition-colors duration-200 focus:outline-none focus:ring-2 ${
            errors[field]
                ? "border-[#D98C7E] focus:border-[#A33B2A] focus:ring-[#A33B2A]/20"
                : "border-[#d9c6b0] focus:border-[#8C6D58] focus:ring-[#8C6D58]/20"
        }`;
    const labelClass = "mb-2 block text-sm font-medium text-[#2D241E]";
    const errorClass = "mt-1 text-sm text-[#A33B2A]";
    const iconClass =
        "pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9B8E82]";

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex items-center gap-2 text-[#2D241E]">
                <User className="h-4 w-4 text-[#8C6D58]" aria-hidden="true" />
                <h2 className="text-base font-semibold">บัญชีเจ้าของร้าน</h2>
            </div>

            <div>
                <label className={labelClass} htmlFor="owner-username">
                    ชื่อผู้ใช้
                </label>
                <div className="relative">
                    <input
                        id="owner-username"
                        type="text"
                        autoComplete="username"
                        placeholder="สำหรับเข้าสู่ระบบ"
                        value={fromState.username}
                        onChange={(e) => handleChange("username", e.target.value)}
                        className={inputClass("username") + " pl-11"}
                    />
                    <User className={iconClass} aria-hidden="true" />
                </div>
                {errors.username && <p className={errorClass}>{errors.username}</p>}
            </div>

            <div>
                <label className={labelClass} htmlFor="owner-display-name">
                    ชื่อแสดง (Display Name)
                </label>
                <div className="relative">
                    <input
                        id="owner-display-name"
                        type="text"
                        placeholder="เช่น คุณสมชาย — เว้นว่างจะใช้ชื่อผู้ใช้แทน"
                        value={fromState.display_name ?? ""}
                        onChange={(e) => handleChange("display_name", e.target.value)}
                        className={inputClass("display_name") + " pl-11"}
                    />
                    <IdCard className={iconClass} aria-hidden="true" />
                </div>
            </div>

            <div>
                <label className={labelClass} htmlFor="owner-email">
                    อีเมล
                </label>
                <div className="relative">
                    <input
                        id="owner-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={fromState.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className={inputClass("email") + " pl-11"}
                    />
                    <Mail className={iconClass} aria-hidden="true" />
                </div>
                {errors.email && <p className={errorClass}>{errors.email}</p>}
            </div>

            <div>
                <label className={labelClass} htmlFor="owner-password">
                    รหัสผ่าน
                </label>
                <div className="relative">
                    <input
                        id="owner-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="อย่างน้อย 6 ตัวอักษร"
                        value={fromState.password}
                        onChange={(e) => handleChange("password", e.target.value)}
                        className={inputClass("password") + " pl-11 pr-12"}
                    />
                    <Lock className={iconClass} aria-hidden="true" />
                    <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-[#9B8E82] transition-colors duration-200 hover:bg-[#EFE8DC] hover:text-[#7a5c45] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/30"
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                            <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                    </button>
                </div>
                {errors.password && <p className={errorClass}>{errors.password}</p>}
            </div>

            <div>
                <label className={labelClass} htmlFor="owner-confirm-password">
                    ยืนยันรหัสผ่าน
                </label>
                <div className="relative">
                    <input
                        id="owner-confirm-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="กรอกรหัสผ่านอีกครั้ง"
                        value={fromState.confirm_password}
                        onChange={(e) => handleChange("confirm_password", e.target.value)}
                        className={inputClass("confirm_password") + " pl-11 pr-12"}
                    />
                    <Lock className={iconClass} aria-hidden="true" />
                    <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-[#9B8E82] transition-colors duration-200 hover:bg-[#EFE8DC] hover:text-[#7a5c45] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/30"
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                            <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                    </button>
                </div>
                {errors.confirm_password && (
                    <p className={errorClass}>{errors.confirm_password}</p>
                )}
            </div>

            {submitError ? (
                <p
                    role="alert"
                    className="rounded-xl border border-[#E8B4A8] bg-[#FBEAE6] px-4 py-3 text-sm text-[#A33B2A]"
                >
                    {submitError}
                </p>
            ) : null}

            <div className="mt-2 flex flex-col gap-3">
                <button
                    className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#8C6D58] text-lg font-semibold text-white transition-colors duration-200 hover:bg-[#7a5c45] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/40 focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    type="submit"
                    disabled={isSubmitting}
                >
                    <UserPlus className="h-5 w-5" aria-hidden="true" />
                    {isSubmitting ? "กำลังสมัคร..." : "สมัครสมาชิก"}
                </button>

                {onBack ? (
                    <button
                        className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#d9c6b0] bg-white text-base font-medium text-[#2D241E] transition-colors duration-200 hover:bg-[#EFE8DC] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/30 disabled:cursor-not-allowed disabled:opacity-60"
                        type="button"
                        onClick={onBack}
                        disabled={isSubmitting}
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        ย้อนกลับ
                    </button>
                ) : null}
            </div>
        </form>
    );
}
