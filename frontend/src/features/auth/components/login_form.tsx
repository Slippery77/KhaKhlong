import { useState } from "react";
import { useLogin } from "../hooks/useLogin";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Store,
  Pencil,
  ArrowLeftRight,
} from "lucide-react";

{
  /*สร้างโครงสร้าง object*/
}
interface loginFormState {
  tenantSlug: string;
  username: string;
  password: string;
}

export default function LoginForm() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  // เก็บค่าฟอร์ม login ทั้ง 3 ช่องแบบ object เพื่อจัดการข้อมูลรวมกันง่าย
  const [formState, setFormState] = useState<loginFormState>({
    tenantSlug: tenantSlug ?? "",
    username: "",
    password: "",
  });
  // แสดง/ซ่อนรหัสผ่าน (ใช้ไอคอน lucide ไม่ใช่ emoji)
  const [showPassword, setShowPassword] = useState(false);
  // ช่องแก้รหัสร้านแบบพับเก็บ — เปิดไว้ก่อนถ้า URL ไม่ได้ระบุร้านมา
  const [slugEditorOpen, setSlugEditorOpen] = useState(!tenantSlug);
  // error ของช่องรหัสร้าน (แยกจาก error ที่ backend ตอบกลับมา)
  const [slugError, setSlugError] = useState<string | null>(null);

  // อัปเดตค่าในฟอร์มตาม field ที่ผู้ใช้พิมพ์เข้าไป
  const handleChange = (field: keyof loginFormState, value: string) => {
    setFormState((prevState) => ({
      ...prevState,
      [field]: value,
    }));
  };

  // ดึงฟังก์ชัน login และสถานะจาก custom hook เพื่อใช้ในการส่งข้อมูลเข้าสู่ระบบ
  const { login, isSubmitting, error } = useLogin();
  const navigate = useNavigate();

  // เมื่อกด submit จะป้องกันการ refresh หน้า และเรียก login ด้วยข้อมูลจากฟอร์ม
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // normalize รหัสร้านให้ตรงกับที่ระบบเก็บ (a-z 0-9 -) ก่อนส่งไป backend
    const slug = formState.tenantSlug.trim().toLowerCase();

    if (!slug) {
      setSlugError("กรอกรหัสร้านก่อนครับ");
      setSlugEditorOpen(true);
      return;
    }
    setSlugError(null);

    const result = await login({ ...formState, tenantSlug: slug });

    if (result) {
      navigate(`/${slug}/tables`); // ถ้า login สำเร็จให้ไปหน้าผังโต๊ะของร้านนั้น
    }
  };

  const inputClass =
    "h-12 w-full rounded-xl border border-[#d9c6b0] bg-white pl-11 pr-4 text-[#2D241E] placeholder:text-[#9B8E82] transition-colors duration-200 focus:border-[#8C6D58] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20";
  const plainInputClass =
    "h-11 w-full rounded-xl border border-[#d9c6b0] bg-white px-3.5 text-sm text-[#2D241E] placeholder:text-[#9B8E82] transition-colors duration-200 focus:border-[#8C6D58] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20";
  const iconClass =
    "pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9B8E82]";

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* ── ร้านที่กำลังจะเข้าสู่ระบบ + ช่องแก้รหัสร้านแบบพับเก็บ ── */}
        <div className="rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 shrink-0 text-[#8C6D58]" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium leading-none text-[#8A7A6B]">
                รหัสร้าน
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-[#2D241E]">
                {formState.tenantSlug || "ยังไม่ได้ระบุ"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSlugEditorOpen((open) => !open)}
              aria-expanded={slugEditorOpen}
              aria-controls="tenant-slug-editor"
              className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[#8C6D58] transition-colors duration-200 hover:bg-[#EFE8DC] hover:text-[#7a5c45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/30"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              {slugEditorOpen ? "ปิด" : "แก้ไข"}
            </button>
          </div>

          {slugEditorOpen ? (
            <div id="tenant-slug-editor" className="mt-3">
              <label
                className="mb-1.5 block text-xs font-medium text-[#4A4038]"
                htmlFor="tenantSlug"
              >
                รหัสร้านของฉัน
              </label>
              <input
                className={plainInputClass}
                id="tenantSlug"
                name="tenantSlug"
                type="text"
                placeholder="เช่น krua-ban"
                autoComplete="organization"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={formState.tenantSlug}
                onChange={(e) => handleChange("tenantSlug", e.target.value)}
                aria-invalid={Boolean(slugError)}
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#8A7A6B]">
                ภาษาอังกฤษตัวเล็ก ตัวเลข และ - เช่น krua-ban
              </p>
              {slugError ? (
                <p role="alert" className="mt-1.5 text-[11px] font-medium text-[#A33B2A]">
                  {slugError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-[#2D241E]"
            htmlFor="username"
          >
            ชื่อผู้ใช้
          </label>
          <div className="relative">
            <input
              className={inputClass}
              id="username"
              name="username"
              type="text"
              placeholder="กรอกชื่อผู้ใช้"
              autoComplete="username"
              value={formState.username}
              onChange={(e) => handleChange("username", e.target.value)}
            />
            <User className={iconClass} aria-hidden="true" />
          </div>
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-[#2D241E]"
            htmlFor="password"
          >
            รหัสผ่าน
          </label>
          <div className="relative">
            <input
              className={inputClass + " pr-12"}
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="กรอกรหัสผ่าน"
              autoComplete="current-password"
              value={formState.password}
              onChange={(e) => handleChange("password", e.target.value)}
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
        </div>

        <div className="mt-2">
          {slugError && !slugEditorOpen ? (
            <p
              role="alert"
              className="mb-3 rounded-xl border border-[#E8B4A8] bg-[#FBEAE6] px-4 py-3 text-sm text-[#A33B2A]"
            >
              {slugError}
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="mb-3 rounded-xl border border-[#E8B4A8] bg-[#FBEAE6] px-4 py-3 text-sm text-[#A33B2A]"
            >
              {error}
            </p>
          ) : null}
          <button
            className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#8C6D58] text-lg font-semibold text-white transition-colors duration-200 hover:bg-[#7a5c45] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/40 focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            <LogIn className="h-5 w-5" aria-hidden="true" />
            {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </div>
      </form>

      {/* ── ทางออกถ้าเข้าผิดร้าน ───────────────────────────────── */}
      <div className="mt-4 flex justify-center">
        <Link
          to="/?switch=1"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[#8C6D58] transition-colors duration-200 hover:text-[#7a5c45] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/30"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
          ไม่ใช่ร้านนี้? เปลี่ยนร้าน
        </Link>
      </div>

      {/* ── ปุ่มไปหน้าสมัครสมาชิก ─────────────────────────────── */}
      <div className="mt-6 border-t border-[#E8DFD5] pt-5 text-center">
        <p className="text-sm text-[#7A6A5C]">
          ยังไม่มีบัญชีผู้ใช้?{" "}
        </p>
        <Link
          to="/register"
          className="mt-2 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#8C6D58] bg-white text-base font-semibold text-[#8C6D58] transition-colors duration-200 hover:bg-[#8C6D58] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/40 focus:ring-offset-2"
        >
          <UserPlus className="h-5 w-5" aria-hidden="true" />
          สมัครสมาชิก
        </Link>
      </div>
    </div>
  );
}

/* ── UI เดิม (feat-benz) — comment ไว้ ใช้ UI ของ feat-aod แทน ──────────
import { Eye, EyeClosed } from "lucide-react";

  const togglePasswordVisibility = () =>{
    setShowPassword((prev)=> !prev);
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-[#E6DCCF] bg-[#FDFBF7] p-10 shadow-sm">
      <h1 className=" text-2xl text-[#4B3B2A] font-semibold">เข้าสู่ระบบ</h1>
      <p className="text-sm text-[#4B3B2A] mb-6">เข้าสู่ระบบมาเริ่มค้าคล่องของคุณ</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className ="mb-6">
          <label className ="mb-2 block text-sm font-semibold text-[#4B3B2A]" htmlFor="username">ชื่อผู้ใช้</label>
          <input
            className="h-12 w-full rounded-lg border border-[#D8C9B6] bg-white px-5 text-[#3F3125] placeholder:text-[#9B8E82] focus:border-[#B59278] focus:outline-none focus:ring-2 focus:ring-[#E8D9C7]"
            type="text"
            placeholder="กรอกชื่อผู้ใช้"
            value={formState.username}
            onChange={(e) => handleChange("username", e.target.value)}
          />
        </div>
        <div className="mb-8">
          <label
            className="mb-2 block font-semibold text-sm text-[#4B3B2A]"
            htmlFor="password"
          >
            รหัสผ่าน
          </label>

        <div className="relative">
            <input
              className="h-12 w-full rounded-lg border border-[#D8C9B6] bg-white px-5 pr-14 text-[#3F3125] placeholder:text-[#9B8E82] focus:border-[#B59278] focus:outline-none focus:ring-2 focus:ring-[#E8D9C7]"
              type={showPassword ? 'text' : 'password'}
              placeholder="กรอกรหัสผ่าน"
              value={formState.password}
              onChange={(e) => handleChange("password", e.target.value)}
            />

            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-[#8C7B6A] hover:text-[#6E5C4C]">
                {showPassword ? <Eye size={20}/> : <EyeClosed size={20}/>}
            </button>
          </div>
        </div>
        <div>
          {error ?(<p role='alert'>{error}</p>) : null}
          <button 
          className = "h-12 w-full rounded-lg bg-[#5C4330] text-lg font-semibold text-white transition hover:bg-[#4B3B2A] active:scale-[0.98]"
          type="submit" 
          disabled={isSubmitting}>เข้าสู่ระบบ</button>
        </div>
      </form>
    </div>
  );
}

*/
