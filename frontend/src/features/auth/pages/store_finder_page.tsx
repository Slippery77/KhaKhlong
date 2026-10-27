import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
    AlertCircle,
    ArrowRight,
    ChefHat,
    ClipboardList,
    History,
    Loader2,
    Store,
    UserPlus,
} from 'lucide-react';
import { publicTenantApi } from '../api/publicTenant.api';
import { clearLastTenantSlug, getLastTenantSlug } from '../tenantStorage';
import { ApiError } from '../../../libs/appClient';
// โลโก้จริงจาก docs/brand (lockup = symbol + wordmark)
import logoWhite from '../../../assets/logo-lockup-white.svg';
import logoBrand from '../../../assets/logo-lockup-brand.svg';

/** รูปแบบเดียวกับ CHECK constraint ของ tenants.tenant_slug */
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

/** แปลงสิ่งที่ผู้ใช้พิมพ์ให้เป็นรหัสร้านรูปแบบที่ระบบเก็บ (a-z 0-9 -) */
function normalizeSlug(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * หน้าแรกของเว็บ — "เข้าสู่ระบบร้านของฉัน"
 *
 * ทำหน้าที่ 3 อย่าง
 * 1. เครื่องที่เคยล็อกอินแล้ว → เด้งเข้า /{slug}/login ของร้านเดิมทันที
 * 2. เครื่องใหม่/กด "เปลี่ยนร้าน" → ให้กรอกรหัสร้าน ตรวจกับ server ก่อนพาไป
 * 3. ทางไปสมัครร้านใหม่
 *
 * การตรวจรหัสกับ server ก่อนทำให้ผู้ใช้เห็นทันทีว่าพิมพ์ผิด
 * แทนที่จะไปติด 401 รวม ๆ ที่หน้า login
 */
export default function StoreFinderPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    // "เปลี่ยนร้าน" ส่ง ?switch=1 มาเพื่อขอดูหน้านี้แม้เครื่องจะจำร้านเดิมอยู่
    const forceSwitch = searchParams.get('switch') === '1';
    // อ่านครั้งแรกครั้งเดียว แล้วเก็บเป็น state เพื่อให้ปุ่ม "ลืมร้านนี้" อัปเดตหน้าจอได้ทันที
    const [lastSlug, setLastSlug] = useState<string | null>(getLastTenantSlug);

    const [slug, setSlug] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);

    // ผู้ใช้ประจำ: เปิดเว็บแล้วเข้าเลย ไม่ต้องผ่านหน้านี้ (ลดขั้นตอนตอนเปิดร้าน)
    if (lastSlug && !forceSwitch) {
        return <Navigate to={`/${lastSlug}/login`} replace />;
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const nextSlug = normalizeSlug(slug);

        if (!nextSlug) {
            setError('กรอกรหัสร้านก่อนครับ');
            return;
        }
        if (!SLUG_PATTERN.test(nextSlug)) {
            setError('รหัสร้านใช้ได้เฉพาะ a-z, 0-9 และเครื่องหมาย - (3–50 ตัวอักษร)');
            return;
        }

        setChecking(true);
        setError(null);
        try {
            const result = await publicTenantApi.lookup(nextSlug);
            if (!result.exists) {
                setError('ไม่พบร้านนี้ — ตรวจรหัสอีกครั้ง หรือสมัครร้านใหม่');
                return;
            }
            if (!result.active) {
                setError('ร้านนี้ปิดใช้งานอยู่ — ติดต่อเจ้าของร้าน');
                return;
            }
            navigate(`/${nextSlug}/login`);
        } catch (e) {
            setError(
                e instanceof ApiError && e.status === 429
                    ? 'ตรวจรหัสร้านบ่อยเกินไป รอสักครู่แล้วลองใหม่'
                    : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง',
            );
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#FAF7F2] font-kanit">
            {/* ── แผงซ้าย: แบรนด์ (ซ่อนบนจอเล็ก) ───────────────────── */}
            <aside className="relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden bg-gradient-to-br from-[#8C6D58] to-[#6B5140] p-10 text-white lg:flex">
                <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/5" />

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
                        เปิดร้านวันนี้
                        <br />
                        เริ่มจากร้านของคุณ
                    </h2>
                    <p className="max-w-sm text-sm leading-relaxed text-white/80">
                        ระบุรหัสร้านครั้งแรกครั้งเดียว จากนั้นเครื่องนี้จะจำร้านให้
                        เปิดเว็บมาถึงเข้าหน้าร้านเดิมได้ทันที
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

            {/* ── แผงขวา: เลือกร้าน ─────────────────────────────────── */}
            <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
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
                    <h1 className="text-2xl font-bold text-[#2D241E]">เข้าสู่ระบบร้านของฉัน</h1>
                    <p className="mt-1 text-sm text-[#7A6A5C]">
                        กรอกรหัสร้านที่ได้รับตอนสมัคร เพื่อไปหน้าเข้าสู่ระบบของร้านนั้น
                    </p>

                    {/* ร้านที่เครื่องนี้จำไว้ — แสดงเฉพาะตอนกด "เปลี่ยนร้าน" */}
                    {lastSlug ? (
                        <div className="mt-6 rounded-2xl border border-[#d9c6b0] bg-[#FAF7F2] p-4">
                            <div className="flex items-start gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8C6D58]/10">
                                    <History className="h-5 w-5 text-[#8C6D58]" aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-[#7A6A5C]">
                                        ร้านที่ใช้ล่าสุดบนเครื่องนี้
                                    </p>
                                    <p className="mt-0.5 truncate text-sm font-semibold text-[#2D241E]">
                                        {lastSlug}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate(`/${lastSlug}/login`)}
                                className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#8C6D58] bg-white text-sm font-semibold text-[#8C6D58] transition-colors duration-200 hover:bg-[#8C6D58] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 focus-visible:ring-offset-2"
                            >
                                เข้าสู่ร้านนี้
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    clearLastTenantSlug();
                                    setLastSlug(null);
                                }}
                                className="mt-1.5 w-full cursor-pointer rounded-lg py-1.5 text-xs text-[#9B8E82] transition-colors duration-200 hover:text-[#A33B2A] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/30"
                            >
                                ลืมร้านนี้ (ล้างข้อมูลเครื่อง)
                            </button>
                        </div>
                    ) : null}

                    {lastSlug ? (
                        <div className="my-5 flex items-center gap-3" aria-hidden="true">
                            <span className="h-px flex-1 bg-[#E8DFD5]" />
                            <span className="text-xs text-[#9B8E82]">หรือใช้ร้านอื่น</span>
                            <span className="h-px flex-1 bg-[#E8DFD5]" />
                        </div>
                    ) : null}

                    <form
                        onSubmit={handleSubmit}
                        className={
                            lastSlug ? "flex flex-col gap-4" : "mt-6 flex flex-col gap-4"
                        }
                    >
                        <div>
                            <label
                                className="mb-2 block text-sm font-medium text-[#2D241E]"
                                htmlFor="store-slug"
                            >
                                รหัสร้าน
                            </label>
                            <div className="relative">
                                <input
                                    className="h-12 w-full rounded-xl border border-[#d9c6b0] bg-white pl-11 pr-4 text-[#2D241E] placeholder:text-[#9B8E82] transition-colors duration-200 focus:border-[#8C6D58] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20"
                                    id="store-slug"
                                    name="store-slug"
                                    type="text"
                                    placeholder="เช่น krua-ban"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    autoComplete="organization"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    aria-describedby="store-slug-help"
                                    aria-invalid={Boolean(error)}
                                />
                                <Store
                                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9B8E82]"
                                    aria-hidden="true"
                                />
                            </div>
                            <p
                                id="store-slug-help"
                                className="mt-2 text-xs leading-relaxed text-[#8A7A6B]"
                            >
                                รหัสภาษาอังกฤษตัวเล็ก ตัวเลข และ - เช่น <span className="font-medium">krua-ban</span>
                                <br />
                                ดูได้จากอีเมลยืนยันการสมัคร หรือถามเจ้าของร้าน
                            </p>
                        </div>

                        <div className="mt-1">
                            {error ? (
                                <p
                                    role="alert"
                                    className="mb-3 flex items-start gap-2 rounded-xl border border-[#E8B4A8] bg-[#FBEAE6] px-4 py-3 text-sm text-[#A33B2A]"
                                >
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                    {error}
                                </p>
                            ) : null}
                            <button
                                className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#8C6D58] text-lg font-semibold text-white transition-colors duration-200 hover:bg-[#7a5c45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                                type="submit"
                                disabled={checking}
                            >
                                {checking ? (
                                    <Loader2
                                        className="h-5 w-5 animate-spin motion-reduce:animate-none"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                                )}
                                {checking ? 'กำลังตรวจรหัสร้าน...' : 'ต่อไป'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 border-t border-[#E8DFD5] pt-5 text-center">
                        <p className="text-sm text-[#7A6A5C]">ยังไม่มีร้านในระบบ?</p>
                        <Link
                            to="/register"
                            className="mt-2 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#8C6D58] bg-white text-base font-semibold text-[#8C6D58] transition-colors duration-200 hover:bg-[#8C6D58] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 focus-visible:ring-offset-2"
                        >
                            <UserPlus className="h-5 w-5" aria-hidden="true" />
                            สมัครร้านใหม่
                        </Link>
                    </div>
                </div>

                <p className="mt-6 text-xs text-[#9B8E82]">
                    © 2026 ค้าคล่อง (KhaKhlong) — ระบบร้านอาหารของคุณ
                </p>
            </main>
        </div>
    );
}
