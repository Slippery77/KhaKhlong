import { useEffect, useRef, useState } from "react";
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
  ShieldAlert,
  AlertCircle,
  Clock,
} from "lucide-react";

interface loginFormState {
  tenantSlug: string;
  username: string;
  password: string;
}

function formatCountdown(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function LoginForm() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [formState, setFormState] = useState<loginFormState>({
    tenantSlug: tenantSlug ?? "",
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [slugEditorOpen, setSlugEditorOpen] = useState(!tenantSlug);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const errorAlertRef = useRef<HTMLDivElement>(null);

  const {
    login,
    isSubmitting,
    error,
    isLocked,
    lockedUntil,
    remainingAttempts,
    clearLock,
  } = useLogin();
  const navigate = useNavigate();

  // นับถอยหลังเวลาปลดล็อกแบบเรียลไทม์เมื่อบัญชีถูกระงับชั่วคราว
  useEffect(() => {
    if (!isLocked || !lockedUntil) return;
    const targetMs = new Date(lockedUntil).getTime();
    if (Number.isNaN(targetMs)) return;

    const timer = window.setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      if (current >= targetMs) {
        window.clearInterval(timer);
        clearLock();
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isLocked, lockedUntil, clearLock]);

  const remainingLockSeconds =
    isLocked && lockedUntil
      ? Math.max(0, Math.ceil((new Date(lockedUntil).getTime() - nowMs) / 1000))
      : 0;
  const isCurrentlyLocked = isLocked && (lockedUntil ? remainingLockSeconds > 0 : true);

  const handleChange = (field: keyof loginFormState, value: string) => {
    setFormState((prevState) => ({
      ...prevState,
      [field]: value,
    }));
    // หากผู้ใช้เปลี่ยนชื่อบัญชีหรือรหัสร้าน ให้ปลดสถานะล็อกของบัญชีเดิมบนหน้าจอเพื่อลองบัญชีอื่นได้
    if ((field === "username" || field === "tenantSlug") && isLocked) {
      clearLock();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const slug = formState.tenantSlug.trim().toLowerCase();

    if (!slug) {
      setSlugError("กรอกรหัสร้านก่อนครับ");
      setSlugEditorOpen(true);
      return;
    }
    setSlugError(null);
    setNowMs(Date.now());

    const result = await login({ ...formState, tenantSlug: slug });

    if (result) {
      navigate(`/${slug}/tables`);
    } else {
      window.requestAnimationFrame(() => {
        errorAlertRef.current?.focus();
      });
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error-alert" : undefined}
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
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error-alert" : undefined}
            />
            <Lock className={iconClass} aria-hidden="true" />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              aria-pressed={showPassword}
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
            <div
              id="login-error-alert"
              ref={errorAlertRef}
              role="alert"
              aria-live="assertive"
              tabIndex={-1}
              className={`mb-3 rounded-xl border px-4 py-3.5 text-sm outline-none transition-colors duration-200 ${
                isCurrentlyLocked
                  ? "border-[#E5B887] bg-[#FDF5EB] text-[#7A4313]"
                  : "border-[#E8B4A8] bg-[#FBEAE6] text-[#A33B2A]"
              }`}
            >
              <div className="flex items-start gap-2.5">
                {isCurrentlyLocked ? (
                  <ShieldAlert
                    className="mt-0.5 h-5 w-5 shrink-0 text-[#B8621B]"
                    aria-hidden="true"
                  />
                ) : (
                  <AlertCircle
                    className="mt-0.5 h-5 w-5 shrink-0 text-[#A33B2A]"
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="font-semibold leading-snug">
                    {isCurrentlyLocked ? "บัญชีถูกระงับชั่วคราว" : error}
                  </p>
                  {isCurrentlyLocked ? (
                    <>
                      <p className="text-xs leading-relaxed text-[#8C5220]">
                        {error}
                      </p>
                      {remainingLockSeconds > 0 ? (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#E5B887]/80 bg-white/80 px-2.5 py-1 text-xs font-medium text-[#7A4313]">
                          <Clock className="h-3.5 w-3.5 text-[#B8621B]" aria-hidden="true" />
                          <span>ลองใหม่ได้ในอีก</span>
                          <span className="font-bold tabular-nums text-[#B8621B]">
                            {formatCountdown(remainingLockSeconds)}
                          </span>
                          <span>นาที</span>
                        </div>
                      ) : null}
                    </>
                  ) : remainingAttempts !== null &&
                    remainingAttempts > 0 &&
                    remainingAttempts <= 2 ? (
                    <p className="text-xs font-medium text-[#8B2E1E]">
                      ระวัง: เหลือโอกาสลองอีก {remainingAttempts} ครั้ง ก่อนบัญชีจะถูกระงับชั่วคราว 5 นาที
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <button
            className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#8C6D58] text-lg font-semibold text-white transition-colors duration-200 hover:bg-[#7a5c45] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/40 focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting || isCurrentlyLocked}
          >
            <LogIn className="h-5 w-5" aria-hidden="true" />
            {isSubmitting
              ? "กำลังเข้าสู่ระบบ..."
              : isCurrentlyLocked && remainingLockSeconds > 0
                ? `บัญชีถูกล็อก (${formatCountdown(remainingLockSeconds)})`
                : "เข้าสู่ระบบ"}
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
