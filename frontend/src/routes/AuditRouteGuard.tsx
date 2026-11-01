import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import AccessDeniedPage from '../components/AccessDeniedPage';

export function AuditRouteGuard() {
  const { user, accessToken } = useAuth();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  // 1. ตรวจสอบ session เข้าสู่ระบบ
  if (!user || !accessToken) {
    return <Navigate to={tenantSlug ? `/${tenantSlug}/login` : '/'} replace />;
  }

  // 2. ป้องกัน Tenant Mismatch
  if (user.tenantSlug && tenantSlug && user.tenantSlug !== tenantSlug) {
    return <Navigate to={`/${user.tenantSlug}/audit-logs`} replace />;
  }

  // 3. ตรวจสอบสิทธิ์ AUD-05 (เฉพาะ Owner และ Manager ที่มีสิทธิ์ audit_log:view)
  const role = user.role?.toLowerCase();
  const isOwner = role === 'owner';
  const isManager = role === 'manager';
  const hasAuditPermission =
    isOwner ||
    isManager ||
    (Array.isArray(user.permissions) && user.permissions.includes('audit_log:view'));

  if (!hasAuditPermission) {
    return (
      <AccessDeniedPage
        title="คุณไม่มีสิทธิ์เข้าถึงประวัติความปลอดภัย"
        message="บันทึกประวัติความปลอดภัย (Audit Logs) สงวนสิทธิ์เฉพาะผู้จัดการหรือเจ้าของร้านเท่านั้น (AUD-05) บัญชีพนักงานไม่ได้รับอนุญาตให้ดูข้อมูลการดำเนินการของระบบ"
      />
    );
  }

  return <Outlet />;
}

