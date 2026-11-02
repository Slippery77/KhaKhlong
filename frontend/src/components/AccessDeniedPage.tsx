import { ShieldAlert, Lock, ArrowLeft, ChefHat, UtensilsCrossed, Utensils, BookOpen } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Header from './Header';
import { useAuth } from '../features/auth/context/AuthContext';
import { ROLE_LABEL } from '../features/users/types/user.types';

interface AccessDeniedPageProps {
  title?: string;
  message?: string;
}

export default function AccessDeniedPage({
  title = 'คุณไม่มีสิทธิ์เข้าถึงส่วนการตั้งค่า',
  message = 'ฟังก์ชันการตั้งค่าระบบสงวนสิทธิ์เฉพาะผู้จัดการหรือเจ้าของร้านเท่านั้น บัญชีของคุณไม่สามารถเข้าถึงข้อมูลในส่วนนี้ได้',
}: AccessDeniedPageProps) {
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { user } = useAuth();

  const role = user?.role?.toLowerCase();
  const isManager = role === 'manager';
  const userRoleLabel = user?.role
    ? ROLE_LABEL[user.role as keyof typeof ROLE_LABEL] ?? user.role
    : 'ไม่มีข้อมูล';

  const tablesUrl = tenantSlug ? `/${tenantSlug}/tables` : '/';
  const kdsUrl = tenantSlug ? `/${tenantSlug}/kds` : '/';
  const settingTablesUrl = tenantSlug ? `/${tenantSlug}/setting/tables` : '/';
  const settingMenuUrl = tenantSlug ? `/${tenantSlug}/setting/menu` : '/';

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(tablesUrl);
    }
  };

  return (
    <div className="flex h-dvh flex-col bg-[#FAF7F2] font-kanit">
      <Header />
      <main
        role="alert"
        aria-labelledby="access-denied-heading"
        className="flex flex-1 items-center justify-center p-4 sm:p-6"
      >
        <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[#E8DFD5] bg-white p-6 shadow-sm sm:p-8 text-center animate-in fade-in zoom-in-95 duration-200">
          {/* แถบสีไฮไลต์ด้านบน */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-[#8C6D58] to-amber-500" />

          {/* ไอคอนแจ้งเตือน */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200/80 bg-amber-50 text-amber-600 shadow-xs">
            <ShieldAlert className="h-8 w-8 stroke-[1.75]" aria-hidden="true" />
          </div>

          {/* ป้ายแสดงตำแหน่งและระดับสิทธิ์ */}
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/80 px-3 py-1 text-xs font-medium text-amber-800">
            <Lock className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
            <span>ตำแหน่งของคุณ: {userRoleLabel}</span>
          </div>

          {/* หัวข้อ */}
          <h1
            id="access-denied-heading"
            className="mb-2 text-xl font-bold tracking-tight text-[#2D241E] sm:text-2xl"
          >
            {title}
          </h1>

          {/* คำอธิบาย */}
          <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-stone-600">
            {message}
          </p>

          {/* ข้อมูลแนะนำฟังก์ชันตามบทบาท */}
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#E8DFD5] bg-[#FAF7F2] p-3.5 text-left">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#EFE8DC] text-[#8C6D58]">
              <UtensilsCrossed className="h-3.5 w-3.5 stroke-2" aria-hidden="true" />
            </div>
            <div className="text-xs leading-normal text-stone-600">
              {isManager ? (
                <>
                  <span className="mb-0.5 block font-semibold text-[#2D241E]">
                    ฟังก์ชันการตั้งค่าที่ผู้จัดการสามารถจัดการได้:
                  </span>
                  ผังโต๊ะอาหาร (`/setting/tables`), เมนูอาหาร (`/setting/menu`) และตัวเลือกเสริม (`/setting/modifier`)
                </>
              ) : (
                <>
                  <span className="mb-0.5 block font-semibold text-[#2D241E]">
                    ฟังก์ชันการทำงานที่พนักงานสามารถเข้าถึงได้:
                  </span>
                  ผังโต๊ะอาหารและรับออเดอร์ (POS), คิวจอครัว (KDS), บันทึกนับสต็อก และการเปิด/ปิดกะทำงาน
                </>
              )}
            </div>
          </div>

          {/* ปุ่มนำทาง */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-center">
            {isManager ? (
              <>
                <Link
                  to={settingTablesUrl}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#8C6D58] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#7a5c45] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] focus-visible:ring-offset-2"
                >
                  <Utensils className="h-4 w-4" aria-hidden="true" />
                  <span>ไปหน้าตั้งค่าโต๊ะ</span>
                </Link>
                <Link
                  to={settingMenuUrl}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-[#2D241E] transition-all hover:bg-[#FAF7F2] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] focus-visible:ring-offset-2"
                >
                  <BookOpen className="h-4 w-4 text-[#8C6D58]" aria-hidden="true" />
                  <span>ไปหน้าจัดการเมนู</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to={tablesUrl}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#8C6D58] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#7a5c45] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] focus-visible:ring-offset-2"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span>กลับสู่หน้าโต๊ะอาหาร</span>
                </Link>
                <Link
                  to={kdsUrl}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-[#2D241E] transition-all hover:bg-[#FAF7F2] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] focus-visible:ring-offset-2"
                >
                  <ChefHat className="h-4 w-4 text-[#8C6D58]" aria-hidden="true" />
                  <span>ไปหน้าจอครัว (KDS)</span>
                </Link>
              </>
            )}
          </div>

          {/* ปุ่มย้อนกลับปลอดภัย */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleBack}
              className="cursor-pointer text-xs text-stone-500 underline underline-offset-4 transition-colors hover:text-[#8C6D58] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#8C6D58]"
            >
              หรือย้อนกลับไปหน้าที่เปิดก่อนหน้านี้
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
