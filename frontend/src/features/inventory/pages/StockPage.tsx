import { useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Package, PackageX, Plus, Search, SearchX } from 'lucide-react';
import Header from '../../../components/Header';
import IngredientForm from '../components/IngredientForm';
import InventoryHistory from '../components/InventoryHistory';
import StockTable from '../components/StockTable';
import StockTransactionForm from '../components/StockTransactionForm';
import { useInventory } from '../hooks/useInventory';
import { useInventoryTransactions } from '../hooks/useInventoryTransactions';
import type { NewIngredientInput } from '../types/inventory.types';

type StockFilter = 'active' | 'low' | 'inactive';

export default function StockPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<StockFilter>('active');
  const inventory = useInventory();
  const history = useInventoryTransactions();

  const activeCount = inventory.items.filter((item) => item.is_active).length;
  const lowStockCount = inventory.items.filter((item) => item.is_active && item.is_low).length;
  const inactiveCount = inventory.items.length - activeCount;

  const visibleItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return inventory.items.filter((item) => {
      if (filter === 'active' && !item.is_active) return false;
      if (filter === 'low' && !(item.is_active && item.is_low)) return false;
      if (filter === 'inactive' && item.is_active) return false;
      return item.name.toLowerCase().includes(term);
    });
  }, [inventory.items, searchTerm, filter]);

  const stats = [
    { key: 'active' as const, label: 'ใช้งาน', count: activeCount, Icon: Package, accent: '#8C6D58' },
    { key: 'low' as const, label: 'ใกล้หมด', count: lowStockCount, Icon: AlertTriangle, accent: '#C27803' },
    { key: 'inactive' as const, label: 'ปิดใช้งาน', count: inactiveCount, Icon: PackageX, accent: '#78716C' },
  ];

  const resetSearch = () => {
    setSearchTerm('');
    setFilter('active');
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF7F2] font-kanit text-[#2D241E] flex flex-col">
      <Header />
      <main className="flex-1 w-full px-8 py-6">
        {/* ── หัวเรื่อง + ปุ่มหลัก ─────────────────────────── */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Package className="w-6 h-6 text-[#8C6D58]" />
            <h1 className="text-lg font-bold">วัตถุดิบ / สต็อก</h1>
          </div>
          <button
            type="button"
            disabled={inventory.isSubmitting}
            onClick={() => setIsAdding((value) => !value)}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#8C6D58] px-4 py-2 text-sm text-white transition-colors duration-200 hover:bg-[#7a5c45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            เพิ่มวัตถุดิบ
          </button>
        </div>

        {/* ── การ์ดสถิติ = ตัวกรอง (กดเพื่อสลับมุมมอง) ───── */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          {stats.map(({ key, label, count, Icon, accent }) => {
            const isSelected = filter === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setFilter(isSelected && key !== 'active' ? 'active' : key)}
                style={isSelected ? { borderColor: accent } : undefined}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 bg-white px-4 py-3 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40 ${
                  isSelected ? '' : 'border-[#E8DFD5] hover:border-[#d9c6b0]'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" style={{ color: accent }} />
                <div>
                  <p className="text-xs text-stone-500">{label}</p>
                  <p className="text-xl font-bold leading-tight" style={isSelected ? { color: accent } : undefined}>
                    {count}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── ค้นหา + จำนวนผลลัพธ์ ─────────────────────────── */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="relative w-80">
            <Search className="absolute left-3.5 top-1/2 w-4 -translate-y-1/2 text-stone-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ค้นหาวัตถุดิบ..."
              aria-label="ค้นหาวัตถุดิบ"
              className="w-full rounded-full border border-[#d9c6b0] bg-white py-2 pl-9 pr-9 text-sm placeholder:text-[#9B8E82] transition-colors duration-200 focus:border-[#8C6D58] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="ล้างการค้นหา"
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-1.5 text-[#9B8E82] transition-colors duration-200 hover:bg-[#EFE8DC] hover:text-[#7a5c45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/30"
              >
                <SearchX className="w-4 h-4" />
              </button>
            )}
          </div>
          <span className="text-sm text-stone-500">
            แสดง {visibleItems.length} รายการ
            {searchTerm && ` จากค้นหา "${searchTerm}"`}
          </span>
        </div>

        {inventory.error && (
          <div role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {inventory.error}
          </div>
        )}

        

        <StockTransactionForm
          items={inventory.items}
          isSubmitting={inventory.isSubmitting}
          onRestock={inventory.restock}
          onWaste={inventory.recordWaste}
        />

        {/* ── หัวตาราง (sticky) ───────────────────────────── */}
        <div className="sticky top-0 z-10 grid grid-cols-[minmax(160px,2fr)_90px_90px_90px_90px_90px_170px] gap-3 border-b border-[#E8DFD5] bg-[#FAF7F2] px-4 py-3 text-sm font-medium text-stone-600">
          <span>วัตถุดิบ</span>
          <span>คงเหลือ</span>
          <span>หน่วย</span>
          <span>หน่วยซื้อ</span>
          <span>อัตรา</span>
          <span>ขั้นต่ำ</span>
          <span />
        </div>

        {isAdding && (
          <IngredientForm
            isSubmitting={inventory.isSubmitting}
            onCancel={() => setIsAdding(false)}
            onSubmit={(input) => inventory.createIngredient(input as NewIngredientInput)}
          />
        )}

        {inventory.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-stone-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            กำลังโหลดสต็อก...
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <SearchX className="w-9 h-9 text-stone-300" />
            <p className="text-sm text-stone-500">
              {inventory.items.length === 0
                ? 'ยังไม่มีวัตถุดิบในระบบ กด "เพิ่มวัตถุดิบ" เพื่อเริ่มต้น'
                : 'ไม่พบวัตถุดิบที่ตรงกับการค้นหาหรือตัวกรอง'}
            </p>
            {inventory.items.length > 0 && (
              <button
                type="button"
                onClick={resetSearch}
                className="cursor-pointer rounded-xl border border-[#8C6D58] px-4 py-1.5 text-sm text-[#8C6D58] transition-colors duration-200 hover:bg-[#8C6D58] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58]/40"
              >
                ล้างการค้นหาและตัวกรอง
              </button>
            )}
          </div>
        ) : (
          <StockTable
            items={visibleItems}
            isSubmitting={inventory.isSubmitting}
            onUpdate={inventory.updateIngredient}
            onDelete={inventory.deleteIngredient}
            onReactivate={(ingredientId) => inventory.updateIngredient(ingredientId, { is_active: true })}
            onRecordStockCount={inventory.recordStockCount}
          />
        )}

        <InventoryHistory
          items={inventory.items}
          transactions={history.transactions}
          total={history.total}
          offset={history.offset}
          limit={history.limit}
          type={history.type}
          ingredientId={history.ingredientId}
          isLoading={history.isLoading}
          error={history.error}
          setType={history.setType}
          setIngredientId={history.setIngredientId}
          previousPage={history.previousPage}
          nextPage={history.nextPage}
        />
      </main>
    </div>
  );
}
