import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UtensilsCrossed, Store, UserRound, Check } from "lucide-react";
import { Register_RestaurantForm } from "../components/register_RestaurantForm";
import { Register_OwnerForm, type RegisterOwnerInfo } from "../components/register_OwnerInfo";
import useRegister from "../hooks/register";
import type { registerRequest } from "../types/register.types";

// ข้อมูลที่กรอกในทุกขั้นตอนของการสมัคร รวมถึงช่องยืนยันรหัสผ่าน
// ใช้ Partial เพราะในแต่ละขั้นตอนอาจมีข้อมูลเพียงบางส่วนเท่านั้น
type FormData = Partial<registerRequest & { confirmPassword: string }>;

export default function Register_page() {
    // เก็บข้อมูลที่กรอกไว้ระหว่างเปลี่ยนจากฟอร์มร้านไปฟอร์มเจ้าของ
    const [formData, setFormData] = useState<FormData>({});

    // ระบุขั้นตอนปัจจุบัน: 1 = ข้อมูลร้าน, 2 = ข้อมูลเจ้าของร้าน
    const [step, setStep] = useState(1);

    const { register, isSubmitting, error } = useRegister();
    const navigate = useNavigate();

    // รับข้อมูลจากฟอร์มร้าน เก็บรวมกับข้อมูลเดิม แล้วไปยังขั้นตอนถัดไป
    const handleRestaurantNext = (data: Partial<registerRequest>) => {
        setFormData((prevState) => ({ ...prevState, ...data }));
        setStep(2);
    };

    // ขั้นสุดท้าย: ส่งข้อมูลทั้งหมด (ร้าน + เจ้าของ) ไปสร้างบัญชีที่ backend
    const handleOwnerNext = async (owner: RegisterOwnerInfo) => {
        const payload: registerRequest = {
            ...(formData as registerRequest),
            username: owner.username,
            email: owner.email,
            password: owner.password,
            // backend บังคับ display_name — ถ้าไม่ได้กรอกแยก ให้ใช้ชื่อผู้ใช้แทน
            display_name: owner.display_name?.trim() || owner.username,
        };

        const result = await register(payload);
        if (result) {
            // สมัครสำเร็จ → ไปหน้าเข้าสู่ระบบของร้านที่เพิ่งสมัคร (แจ้งสำเร็จผ่าน state)
            navigate(`/${payload.tenant_slug}/login`, {
                state: { registered: true },
            });
        }
    };

    // รายการขั้นตอนสำหรับ indicator บนแผงแบรนด์
    const steps = [
        { no: 1, label: "ข้อมูลร้าน", icon: Store },
        { no: 2, label: "ข้อมูลเจ้าของ", icon: UserRound },
    ];

    return (
        <div className="flex min-h-screen bg-[#FAF7F2] font-kanit">
            {/* ── แผงซ้าย: แบรนด์ + สถานะขั้นตอน (ซ่อนบนจอเล็ก) ─────── */}
            <aside className="relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden bg-gradient-to-br from-[#8C6D58] to-[#6B5140] p-10 text-white lg:flex">
                {/* วงกลมตกแต่งหลัง */}
                <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/5" />

                <div className="relative flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                        <UtensilsCrossed className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span className="text-xl font-semibold tracking-wide">
                        ค้าคล่อง
                        <span className="ml-2 text-sm font-normal text-white/60">
                            KhaKhlong
                        </span>
                    </span>
                </div>

                <div className="relative space-y-6">
                    <h2 className="text-3xl font-bold leading-snug">
                        เปิดร้านของคุณ
                        <br />
                        บนระบบเดียวที่ครบวงจร
                    </h2>
                    <p className="max-w-sm text-sm leading-relaxed text-white/80">
                        สมัครใช้งานฟรี ใช้เวลาไม่ถึง 2 นาที
                        แล้วเริ่มขายได้ทันทีทั้งบิล ครัว และรายงาน
                    </p>

                    {/* indicator ขั้นตอน */}
                    <ol className="space-y-4 pt-2">
                        {steps.map((s) => {
                            const done = step > s.no;
                            const active = step === s.no;
                            const Icon = s.icon;
                            return (
                                <li key={s.no} className="flex items-center gap-3">
                                    <span
                                        className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-200 ${
                                            done
                                                ? "border-white bg-white text-[#8C6D58]"
                                                : active
                                                  ? "border-white bg-white/20"
                                                  : "border-white/30 text-white/50"
                                        }`}
                                    >
                                        {done ? (
                                            <Check className="h-5 w-5" aria-hidden="true" />
                                        ) : (
                                            <Icon className="h-5 w-5" aria-hidden="true" />
                                        )}
                                    </span>
                                    <span
                                        className={`text-sm font-medium ${
                                            active ? "text-white" : "text-white/60"
                                        }`}
                                    >
                                        ขั้นตอน {s.no} — {s.label}
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                </div>

                <p className="relative text-xs text-white/60">
                    ค้าคล่อง (KhaKhlong) — ระบบขายหน้าร้านสำหรับร้านอาหาร
                </p>
            </aside>

            {/* ── แผงขวา: ฟอร์มสมัครสมาชิก ─────────────────────────── */}
            <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
                {/* โลโก้เล็ก ๆ บนมือถือ (แผงแบรนด์ถูกซ่อน) */}
                <div className="mb-6 flex items-center gap-3 lg:hidden">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8C6D58] text-white">
                        <UtensilsCrossed className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-lg font-semibold text-[#2D241E]">
                        ค้าคล่อง
                        <span className="ml-1.5 text-sm font-normal text-[#7A6A5C]">
                            KhaKhlong
                        </span>
                    </span>
                </div>

                <div className="w-full max-w-lg rounded-2xl border border-[#E8DFD5] bg-white p-8 shadow-[0_4px_24px_rgba(45,36,30,0.07)]">
                    <h1 className="text-2xl font-bold text-[#2D241E]">สมัครสมาชิก</h1>
                    <p className="mt-1 text-sm text-[#7A6A5C]">
                        ขั้นตอนที่ {step} จาก 2 —{" "}
                        {step === 1 ? "ข้อมูลร้านอาหาร" : "ข้อมูลเจ้าของร้าน"}
                    </p>

                    {/* แถบความคืบหน้า */}
                    <div className="mt-4 flex gap-2" aria-hidden="true">
                        {[1, 2].map((n) => (
                            <span
                                key={n}
                                className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
                                    step >= n ? "bg-[#8C6D58]" : "bg-[#E8DFD5]"
                                }`}
                            />
                        ))}
                    </div>

                    <div className="mt-6">
                        {/* แสดงฟอร์มตามขั้นตอนปัจจุบันของการสมัคร */}
                        {step === 1 ? (
                            // ขั้นตอนแรก: กรอกข้อมูลร้านและส่งข้อมูลกลับมาผ่าน onNext
                            <Register_RestaurantForm
                                initialValues={formData}
                                onNext={handleRestaurantNext}
                            />
                        ) : (
                            // ขั้นตอนสอง: กรอกข้อมูลเจ้าของร้าน แล้วส่งสมัครจริง
                            <Register_OwnerForm
                                initialValues={formData}
                                onNext={handleOwnerNext}
                                isSubmitting={isSubmitting}
                                submitError={error}
                                onBack={() => setStep(1)}
                            />
                        )}
                    </div>
                </div>

                <p className="mt-6 text-xs text-[#9B8E82]">
                    © 2026 ค้าคล่อง (KhaKhlong) — ระบบร้านอาหารของคุณ
                </p>
            </main>
        </div>
    );
}
