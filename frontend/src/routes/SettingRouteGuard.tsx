import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import AccessDeniedPage from '../components/AccessDeniedPage';
import Header from '../components/Header';
import SettingNavBar from '../components/settingNavBar';

export function SettingRouteGuard() {
  const { user, accessToken } = useAuth();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const location = useLocation();

  // 1. หากไม่มี session ให้เด้งไปหน้า login ของร้าน
  if (!user || !accessToken) {
    return <Navigate to={tenantSlug ? `/${tenantSlug}/login` : '/'} replace />;
  }

  // 2. ป้องกัน Tenant Mismatch (เข้า URL ข้ามร้าน)
  if (user.tenantSlug && tenantSlug && user.tenantSlug !== tenantSlug) {
    return <Navigate to={`/${user.tenantSlug}/setting`} replace />;
  }

  // 3. ตรวจสอบสิทธิ์ระดับผู้ใช้
  const role = user.role?.toLowerCase();
  const isOwner = role === 'owner';
  const isManager = role === 'manager';
  const canAccessSettings = isOwner || isManager;

  // พนักงาน (employee) หรือบทบาทอื่นที่ไม่มีสิทธิ์เข้าถึงการตั้งค่า
  if (!canAccessSettings) {
    return (
      <AccessDeniedPage
        title="คุณไม่มีสิทธิ์เข้าถึงส่วนการตั้งค่า"
        message="การตั้งค่าระบบสงวนสิทธิ์เฉพาะผู้จัดการหรือเจ้าของร้านเท่านั้น บัญชีพนักงานไม่สามารถเข้าถึงข้อมูลในส่วนนี้ได้"
      />
    );
  }

  // 4. สิทธิ์เฉพาะเจ้าของร้าน (Owner only) สำหรับหน้า ข้อมูลร้าน, ภาษี/VAT และบัญชีผู้ใช้
  const currentPath = location.pathname.toLowerCase();
  const isOwnerOnlyRoute =
    currentPath.endsWith('/setting/store') ||
    currentPath.endsWith('/setting/vat') ||
    currentPath.endsWith('/setting/users');

  if (!isOwner && isOwnerOnlyRoute) {
    return (
      <AccessDeniedPage
        title="คุณไม่มีสิทธิ์เข้าถึงหน้านี้"
        message="การตั้งค่าข้อมูลร้าน อัตราค่าบริการ/VAT และบัญชีผู้ใช้ สงวนสิทธิ์เฉพาะเจ้าของร้านเท่านั้น (ผู้จัดการสามารถจัดการเฉพาะผังโต๊ะ เมนูอาหาร และตัวเลือกเสริม)"
      />
    );
  }

  // โครงสร้าง Persistent Layout สำหรับหน้าตั้งค่าทั้งหมด — Header และ SettingNavBar จะไม่ถูก Unmount เมื่อสลับแท็บ
  return (
    <div className="flex h-dvh flex-col font-kanit bg-[#FAF7F2] overflow-hidden">
      <Header />
      <SettingNavBar />
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
