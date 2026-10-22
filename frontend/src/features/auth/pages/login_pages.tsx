import { ChefHat, ClipboardList, CheckCircle2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import LoginForm from "../components/login_form";
// โลโก้ค้าคล่องจริงจาก docs/brand (lockup = symbol + wordmark เป็น outlined path)
import logoWhite from "../../../assets/logo-lockup-white.svg";
import logoBrand from "../../../assets/logo-lockup-brand.svg";

export function LoginPage() {
    // state ที่หน้า register ส่งมาหลังสมัครสำเร็จ
    const location = useLocation();
    const registered = (location.state as { registered?: boolean } | null)?.registered;

    return (
        <div className="flex min-h-screen bg-[#FAF7F2] font-kanit">
            {/* ── แผงซ้าย: แบรนด์ร้าน (ซ่อนบนจอเล็ก) ───────────────── */}
            <aside className="relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden bg-gradient-to-br from-[#8C6D58] to-[#6B5140] p-10 text-white lg:flex">
                {/* วงกลมตกแต่งหลัง */}
                <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/5" />

                {/* โลโก้จริง (สี reverse/ขาว ตาม guidelines: บนพื้นน้ำตาลเข้มใช้สีขาว) */}
                <div className="relative flex items-center">
                    <img
                        src={logoWhite}
                        alt="ค้าคล่อง KhaKhlong"
                        className="h-20 w-auto"
                        width={623}
                        height={256}
                    />
                </div>

                <div className="relative space-y-4">
                    <h2 className="text-3xl font-bold leading-snug">
                        จัดการร้านอาหาร
                        <br />
                        ง่ายในที่เดียว
                    </h2>
                    <p className="max-w-sm text-sm leading-relaxed text-white/80">
                        เปิดบิล ส่งครัว ดูคิว KDS รายงานยอดขาย และจัดการโต๊ะทั้งร้าน
                        ในระบบเดียวที่ใช้งานได้ทุกอุปกรณ์
                    </p>
                    <ul className="space-y-2 pt-2 text-sm text-white/90">
                        <li className="flex items-center gap-2">
                            <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />
                            เปิด–ปิดบิลและคิดเงินรวดเร็ว
                        </li>
                        <li className="flex items-center gap-2">
                            <ChefHat className="h-4 w-4 shrink-0" aria-hidden="true" />
                            คิวครัวเรียลไทม์ตรงกันทุกจุด
                        </li>
                    </ul>
                </div>

                <p className="relative text-xs text-white/60">
                    ค้าคล่อง (KhaKhlong) — ระบบขายหน้าร้านสำหรับร้านอาหาร
                </p>
            </aside>

            {/* ── แผงขวา: ฟอร์มเข้าสู่ระบบ ─────────────────────────── */}
            <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
                {/* โลโก้จริงบนมือถือ (แผงแบรนด์ถูกซ่อน) — สีแบรนด์บนพื้นครีม */}
                <div className="mb-6 flex items-center lg:hidden">
                    <img
                        src={logoBrand}
                        alt="ค้าคล่อง KhaKhlong"
                        className="h-12 w-auto"
                        width={623}
                        height={256}
                    />
                </div>

                <div className="w-full max-w-md rounded-2xl border border-[#E8DFD5] bg-white p-8 shadow-[0_4px_24px_rgba(45,36,30,0.07)]">
                    {registered ? (
                        <p
                            role="status"
                            className="mb-5 flex items-center gap-2 rounded-xl border border-[#A9C9A0] bg-[#EFF6EC] px-4 py-3 text-sm text-[#3F6B35]"
                        >
                            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                            สมัครสมาชิกสำเร็จ — เข้าสู่ระบบด้วยบัญชีของคุณได้เลย
                        </p>
                    ) : null}
                    <h1 className="text-2xl font-bold text-[#2D241E]">เข้าสู่ระบบ</h1>
                    <p className="mt-1 text-sm text-[#7A6A5C]">
                        กรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าใช้งานระบบ
                    </p>
                    <div className="mt-6">
                        <LoginForm />
                    </div>
                </div>

                <p className="mt-6 text-xs text-[#9B8E82]">
                    © 2026 ค้าคล่อง (KhaKhlong) — ระบบร้านอาหารของคุณ
                </p>
            </main>
        </div>
    );
}
