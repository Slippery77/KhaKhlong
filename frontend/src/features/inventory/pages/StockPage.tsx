import { useMemo, useState } from 'react';
import { AlertTriangle, Package, Plus, Search } from 'lucide-react';
import Header from '../../../components/Header';
import IngredientForm from '../components/IngredientForm';
import InventoryHistory from '../components/InventoryHistory';
import StockTable from '../components/StockTable';
import StockTransactionForm from '../components/StockTransactionForm';
import { useInventory } from '../hooks/useInventory';
import { useInventoryTransactions } from '../hooks/useInventoryTransactions';
import type { NewIngredientInput } from '../types/inventory.types';

export default function StockPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const inventory = useInventory();
  const history = useInventoryTransactions();
  const visibleItems = useMemo(() => inventory.items.filter((item) => (showInactive || item.is_active) && item.name.toLowerCase().includes(searchTerm.toLowerCase())), [inventory.items, searchTerm, showInactive]);
  const lowStockCount = inventory.items.filter((item) => item.is_active && item.is_low).length;

  return <div className="min-h-screen w-full bg-[#FAF7F2] font-kanit text-[#2D241E] flex flex-col"><Header /><main className="flex-1 w-full px-8 py-6"><div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-2.5"><Package className="w-6 h-6 text-[#8C6D58]" /><h1 className="text-lg font-bold">วัตถุดิบ / สต็อก</h1></div><div className="flex items-center gap-3">{lowStockCount > 0 && <div className="flex items-center gap-1.5 rounded-xl bg-[#C27803] px-3.5 py-1.5 text-sm text-white"><AlertTriangle className="w-4 h-4" />ใกล้หมด {lowStockCount} รายการ</div>}<button type="button" disabled={inventory.isSubmitting} onClick={() => setIsAdding((value) => !value)} className="flex items-center gap-1.5 rounded-xl bg-[#8C6D58] px-4 py-2 text-sm text-white disabled:opacity-50"><Plus className="w-4 h-4" />เพิ่มวัตถุดิบ</button></div></div><div className="mb-4 flex items-center justify-between"><div className="relative w-80"><Search className="absolute left-3.5 top-1/2 w-4 -translate-y-1/2 text-stone-400" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="ค้นหาวัตถุดิบ..." className="w-full rounded-full border bg-white py-2 pl-9 pr-4 text-sm" /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />แสดงรายการที่ปิดใช้งาน</label></div>{inventory.error && <div role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{inventory.error}</div>}{isAdding && <IngredientForm isSubmitting={inventory.isSubmitting} onCancel={() => setIsAdding(false)} onSubmit={(input) => inventory.createIngredient(input as NewIngredientInput)} />}<StockTransactionForm items={inventory.items} isSubmitting={inventory.isSubmitting} onRestock={inventory.restock} onWaste={inventory.recordWaste} /><div className="grid grid-cols-[minmax(160px,2fr)_90px_90px_90px_90px_90px_170px] gap-3 border-b px-4 py-3 text-sm font-medium text-stone-600"><span>วัตถุดิบ</span><span>คงเหลือ</span><span>หน่วย</span><span>หน่วยซื้อ</span><span>อัตรา</span><span>ขั้นต่ำ</span><span /></div>{inventory.isLoading ? <p className="py-10 text-center text-stone-500">กำลังโหลดสต็อก...</p> : <StockTable items={visibleItems} isSubmitting={inventory.isSubmitting} onUpdate={inventory.updateIngredient} onDelete={inventory.deleteIngredient} onReactivate={(ingredientId) => inventory.updateIngredient(ingredientId, { is_active: true })} onRecordStockCount={inventory.recordStockCount} />}<InventoryHistory items={inventory.items} transactions={history.transactions} total={history.total} offset={history.offset} limit={history.limit} type={history.type} ingredientId={history.ingredientId} isLoading={history.isLoading} error={history.error} setType={history.setType} setIngredientId={history.setIngredientId} previousPage={history.previousPage} nextPage={history.nextPage} /></main></div>;
}
