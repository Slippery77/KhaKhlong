import { useEffect, useState, useCallback, useRef } from 'react';
import { ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../auth/context/AuthContext';
import { apiFetch } from '../../libs/appClient';
import Header from '../../components/Header';
import { AuditTable } from './components/AuditTable';
import { AuditFilters } from './components/AuditFilters';
import type { UserOption } from './components/AuditFilters';
import { AuditDetailModal } from './components/AuditDetailModal';
import type { AuditLogItem, AuditPagination } from './types';

export default function AuditLogsPage() {
  const { accessToken } = useAuth();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState<AuditPagination>({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [actionType, setActionType] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Users list for filter dropdown
  const [users, setUsers] = useState<UserOption[]>([]);

  // Selected Log for Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // ป้องกัน race condition กรณี user เปลี่ยน filter รัวๆ
  const reqSeqRef = useRef<number>(0);

  // Fetch Users for Filter (โหลดเฉพาะผู้มีสิทธิ์ user:manage หรือ fallback ถ้าไม่มี)
  useEffect(() => {
    let active = true;
    async function loadUsers() {
      try {
        const res = await apiFetch<{ status: string; data: UserOption[] }>('/users', accessToken);
        if (active && res.data && Array.isArray(res.data)) {
          setUsers(res.data);
        }
      } catch {
        // หากเป็น Manager ที่ไม่มีสิทธิ์ user:manage จะได้ 403 ก็ให้ปล่อยผ่าน (ไม่ขัดขวางการดู Audit Log)
      }
    }
    if (accessToken) {
      loadUsers();
    }
    return () => {
      active = false;
    };
  }, [accessToken]);

  // Fetch Audit Logs
  const fetchLogs = useCallback(
    async (currentPage: number) => {
      if (!accessToken) return;
      const currentSeq = ++reqSeqRef.current;
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams();
        queryParams.set('page', currentPage.toString());
        queryParams.set('limit', '20');

        if (actionType) queryParams.set('action_type', actionType);
        if (userId) queryParams.set('user_id', userId);
        if (from) queryParams.set('from', from);
        if (to) queryParams.set('to', to);

        const res = await apiFetch<{
          status: string;
          data: { items: AuditLogItem[]; pagination: AuditPagination };
        }>(`/audit-logs?${queryParams.toString()}`, accessToken);

        // ตรวจสอบว่าเป็นผลลัพธ์ของคำขอล่าสุดหรือไม่ เพื่อป้องกัน race condition
        if (currentSeq === reqSeqRef.current && res.data) {
          setLogs(res.data.items || []);
          setPagination(
            res.data.pagination || {
              page: currentPage,
              limit: 20,
              total: 0,
              total_pages: 1,
            }
          );
        }
      } catch (err: any) {
        if (currentSeq === reqSeqRef.current) {
          setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล Audit Log');
        }
      } finally {
        if (currentSeq === reqSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [accessToken, actionType, userId, from, to]
  );

  useEffect(() => {
    setPage(1);
  }, [actionType, userId, from, to]);

  useEffect(() => {
    fetchLogs(page);
  }, [fetchLogs, page]);

  const handleResetFilters = () => {
    setActionType('');
    setUserId('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-kanit pb-12 flex flex-col">
      {/* Top Header Bar */}
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-[#d9c6b0] shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-[#EFE8DC] rounded-2xl text-[#8C6D58]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#2D241E]">บันทึกประวัติความปลอดภัย (Audit Logs)</h1>
              <p className="text-xs sm:text-sm text-stone-500 font-normal">
                ตรวจสอบประวัติการทำรายการสำคัญ การล็อกอิน และการเปลี่ยนแปลงการตั้งค่าในระบบ (สิทธิ์ AUD-05)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchLogs(page)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#8C6D58] bg-[#EFE8DC]/60 hover:bg-[#EFE8DC] rounded-xl transition-colors cursor-pointer border border-[#d9c6b0] shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>รีเฟรชข้อมูล</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter Section */}
        <AuditFilters
          actionType={actionType}
          onActionTypeChange={setActionType}
          userId={userId}
          onUserIdChange={setUserId}
          from={from}
          onFromChange={setFrom}
          to={to}
          onToChange={setTo}
          users={users}
          onReset={handleResetFilters}
        />

        {/* Audit Logs Table */}
        <AuditTable
          logs={logs}
          pagination={pagination}
          loading={loading}
          onPageChange={setPage}
          onViewDetail={(item) => setSelectedLog(item)}
        />
      </main>

      {/* Detail Modal */}
      <AuditDetailModal item={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
