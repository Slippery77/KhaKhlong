import Header from '../../../components/Header';
import SettingNavBar from '../../../components/settingNavBar';
import ListMenuEdit from '../components/listMenu';
import SidebarCategory from '../components/sidebarCategory';
import { useAdminMenu, useCreateCategory, useEditMenu, useMenuItemStatus, useCreateMenu, useEditCategory } from '../hooks/useAdminMenu';
import type { Category, MenuItem } from '../types/menu.types';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import MenuFormPopup, { type MenuFormValues } from '../components/menuFormPopup';

export function MenuEdit() {
    const { categories,isLoading, error, reload } = useAdminMenu();
    const [ selectedId, setSelectedId] = useState<string | null>(null);
    const [ showInactive, setShowInactive ] = useState(true);
    const [ search, setSearch ] = useState('');
    const { createCategory,isSubmitting, error:createError} = useCreateCategory();
    const { setAvailability,disable,enable /*isSubmitting:isStatusSubmitting*/, error:statusError} = useMenuItemStatus();
    const { editMenuItem, isSubmitting:submitEdit, error:editMenuError } = useEditMenu();
    const { createMenuItem , isSubmitting:submitCreate, error:createMenuError } = useCreateMenu();
    const { editCategoryName, disable: disableCategory, enable: enableCategory,isSubmitting: submitCategory, error: editCategoryError } = useEditCategory();

    const [ formItem, setFormItem ] = useState<MenuItem|undefined>();
    const [ showForm, setShowForm ] = useState(false);

    if (isLoading) return <p>กำลังโหลด...</p>;
    if (error) return <p className="text-red-600">{error}</p>;

    const selected = categories.find(c=> c.category_id === selectedId) ?? categories[0];
    const items = selected?.items ?? [];
    const soldOutCount = items.filter(m => m.is_active && !m.is_available).length;
    const inactiveCount = items.filter(m => !m.is_active).length;

    const handleAdd = async (name:string)=>{
        const created = await createCategory(name);
        if(created){
            await reload();
            setSelectedId(created.category_id);
        }
      return !!created;
    };

    const handleToggleAvailable = async (item: MenuItem) => {
      const toggle = await setAvailability(item.menu_item_id, !item.is_available);
      if (toggle) {
        await reload();
      }
    };

    const handleDisable = async (item: MenuItem) => {
      const toggle = await disable(item.menu_item_id);
      if(toggle){
        await reload();
      }
        console.log('disable', item.menu_item_id);
    };

    const handleEnable = async (item: MenuItem) => {
      const toggle = await enable(item.menu_item_id);
      if(toggle){
        await reload();
      }
        console.log('enable', item.menu_item_id);
    };

    const handleEditMenu = (item: MenuItem) => {
      setShowForm(true);
      setFormItem(item);  
    };

    const handleSubmitMenu = async (value:MenuFormValues) => {
      if(!formItem){        
        if(!selected){
          return false;
        }

        const createMenu = await createMenuItem(selected.category_id,value.name, value.description, value.price);
        if(createMenu){
          await reload();
        }
        // createMenuItem คืน id หรือ undefined → แปลงเป็น boolean ให้ popup รู้ว่าปิดได้
        return !!createMenu;
      }

        const editMenu = await editMenuItem(
          formItem.menu_item_id, 
          value.name !== formItem.name ? value.name : undefined, 
          value.description !== formItem.description ? value.description : undefined, 
          value.price !== formItem.price ? value.price : undefined,
        );
        if(editMenu){
          await reload();
        }
        return editMenu; 
    }

    const handleRenameCategory = async ( categoryId:string, name: string )=>{
      const ok = await editCategoryName(categoryId,name);
      if(ok)
        await reload();
      return ok;
    }

    const handleToggleCategory = async (category: Category)=>{
      const ok = category.is_active ? await disableCategory(category.category_id) : await enableCategory(category.category_id);
      if(ok){
        await reload();
      }
      return ok;
    }

  return (
    <div className="flex h-dvh flex-col font-kanit">
      <Header />
      <SettingNavBar/>
      <div className="flex min-h-0 flex-1">
       <SidebarCategory
          categories={categories}
          selectedId={selected?.category_id ?? null}
          onSelect={setSelectedId}
          onAdd={handleAdd}
          isSubmitting={isSubmitting}
          error={createError}
          onRenameCategory={handleRenameCategory}
          onToggleCategory={handleToggleCategory}
          editIsSubmitting={submitCategory}
          editError={editCategoryError}
         />
        <main className="flex-1 overflow-y-auto bg-[#FAF7F2] p-6">

          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#2D241E]">{selected?.name ?? 'ยังไม่มีหมวด'}</h1>
              <p className="text-sm text-stone-500">
                {items.length} เมนู · หมดวันนี้ {soldOutCount} · เลิกขาย {inactiveCount}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="showdisable" className="flex cursor-pointer items-center gap-2 text-sm text-stone-600">
                <input
                  id="showdisable"
                  type="checkbox"
                  checked={showInactive}
                  onChange={e => setShowInactive(e.target.checked)}
                  className="h-4 w-4 accent-[#8C6D58]"
                />
                แสดงที่เลิกขาย
              </label>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาเมนู"
                className="w-40 rounded-xl border border-[#d9c6b0] bg-white px-3 py-2 text-sm outline-none focus:border-[#8C6D58]"
              />

              <button
                type="button"
                onClick={()=> { setFormItem(undefined); setShowForm(true);}}
                className="flex items-center gap-1 rounded-xl bg-[#8C6D58] px-4 py-2 font-semibold text-white transition hover:bg-[#7a5c45] active:scale-95"
              >
                <Plus size={18}/>เพิ่มเมนู
              </button>
              { showForm && (<MenuFormPopup item={formItem} onSubmit={handleSubmitMenu} onClose={()=>setShowForm(false)} isSubmitting={ formItem ? submitEdit : submitCreate} error={ formItem ? editMenuError : createMenuError}/>)}
            </div>
          </div>
          
          {statusError && <p className="mb-2 text-sm text-red-600">{statusError}</p>}
          <ListMenuEdit
            menuItem={items}
            showInactive={showInactive}
            search={search}
            onToggleAvailable={handleToggleAvailable}
            onDisable={handleDisable}
            onEnable={handleEnable}
            onEdit={handleEditMenu}
          />
        </main>
      </div>
    </div>
  );
}
