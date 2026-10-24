// Seed modifier groups + modifiers + link to menu items
// Usage: node backend/seed-modifiers.mjs

const BASE = "http://localhost:3000/api";

async function api(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${method} ${path} → ${res.status} ${txt}`);
  }
  return res.json();
}

// ----------------------------------------------------------------
// Modifier groups to create
// ----------------------------------------------------------------
const MODIFIER_GROUPS = [
  {
    name: "ระดับความเผ็ด",
    selectionType: "single",
    isRequired: true,
    modifiers: [
      { name: "ไม่เผ็ด",    priceDelta: 0 },
      { name: "เผ็ดน้อย",   priceDelta: 0 },
      { name: "เผ็ดปกติ",   priceDelta: 0 },
      { name: "เผ็ดมาก",    priceDelta: 0 },
      { name: "เผ็ดสุดๆ",   priceDelta: 0 },
    ],
    // เมนูที่ต้องผูก (จับคู่ด้วยชื่อ)
    linkMenuNames: [
      "ผัดกระเพราหมูสับ",
      "ผัดกระเพราไก่",
      "ผัดซีอิ๊วหมู",
      "ราดหน้าหมู",
      "ต้มยำกุ้ง",
      "แกงเขียวหวานไก่",
    ],
  },
  {
    name: "เพิ่มไข่ดาว",
    selectionType: "single",
    isRequired: false,
    modifiers: [
      { name: "ไม่เพิ่ม",  priceDelta: 0  },
      { name: "เพิ่มไข่ดาว", priceDelta: 10 },
    ],
    linkMenuNames: [
      "ข้าวผัดกุ้ง",
      "ข้าวผัดหมู",
      "ข้าวผัดปู",
      "ผัดกระเพราหมูสับ",
      "ผัดกระเพราไก่",
    ],
  },
  {
    name: "ชนิดเส้น",
    selectionType: "single",
    isRequired: true,
    modifiers: [
      { name: "เส้นใหญ่",  priceDelta: 0 },
      { name: "เส้นเล็ก",  priceDelta: 0 },
      { name: "วุ้นเส้น",  priceDelta: 0 },
      { name: "เส้นหมี่",  priceDelta: 0 },
    ],
    linkMenuNames: [
      "ผัดซีอิ๊วหมู",
      "ราดหน้าหมู",
    ],
  },
  {
    name: "ท็อปปิ้งเพิ่ม",
    selectionType: "multi",
    isRequired: false,
    modifiers: [
      { name: "ซอสพริก",     priceDelta: 0  },
      { name: "ซอสมะขาม",    priceDelta: 0  },
      { name: "เพิ่มน้ำจิ้ม", priceDelta: 0  },
      { name: "เพิ่มข้าวเหนียว", priceDelta: 15 },
    ],
    linkMenuNames: [
      "ไก่ทอด",
      "คอหมูย่าง",
      "หมูปิ้ง",
      "ไส้กรอกอีสาน",
      "ทอดมันปลากราย",
      "ปอเปี๊ยะทอด",
    ],
  },
  {
    name: "ความหวาน",
    selectionType: "single",
    isRequired: true,
    modifiers: [
      { name: "หวานน้อย",    priceDelta: 0 },
      { name: "หวานปกติ",    priceDelta: 0 },
      { name: "หวานมาก",     priceDelta: 0 },
      { name: "ไม่หวาน",    priceDelta: 0 },
    ],
    linkMenuNames: [
      "ชาไทยเย็น",
      "ชามะนาว",
      "น้ำส้มคั้น",
      "กาแฟเย็น",
      "โกโก้เย็น",
    ],
  },
  {
    name: "ขนาดแก้ว",
    selectionType: "single",
    isRequired: true,
    modifiers: [
      { name: "แก้วเล็ก",   priceDelta: -10 },
      { name: "แก้วปกติ",   priceDelta: 0   },
      { name: "แก้วใหญ่",   priceDelta: 15  },
    ],
    linkMenuNames: [
      "ชาไทยเย็น",
      "ชามะนาว",
      "กาแฟเย็น",
      "โกโก้เย็น",
    ],
  },
  {
    name: "ท็อปปิ้งของหวาน",
    selectionType: "multi",
    isRequired: false,
    modifiers: [
      { name: "เพิ่มไอศกรีม",    priceDelta: 20 },
      { name: "เพิ่มนมข้น",       priceDelta: 5  },
      { name: "เพิ่มถั่วแดง",     priceDelta: 10 },
      { name: "เพิ่มลูกชิด",      priceDelta: 10 },
    ],
    linkMenuNames: [
      "ไอศกรีมกะทิ",
      "โรตีกล้วยหอม",
      "ข้าวเหนียวมะม่วง",
      "บัวลอยน้ำขิง",
    ],
  },
];

// ----------------------------------------------------------------
// main
// ----------------------------------------------------------------
(async () => {
  // login
  const loginRes = await api("POST", "/auth/login", {
    tenantSlug: "test-a",
    username: "owner_a",
    password: "12345678",
  });
  const token = loginRes.accessToken;
  console.log("✓ Login");

  // ดึงข้อมูลปัจจุบัน
  const adminRes = await api("GET", "/menu/admin", null, token);
  const existingGroups = adminRes.data?.modifier_groups ?? [];
  const allCategories = adminRes.data?.categories ?? [];

  // สร้าง name→id map สำหรับ modifier groups
  const groupMap = {}; // name → group_id
  for (const g of existingGroups) {
    if (g.is_active) groupMap[g.name] = g.modifier_group_id;
  }

  // สร้าง name→id map สำหรับ menu items
  const menuMap = {}; // name → menu_item_id
  for (const cat of allCategories) {
    const items = Array.isArray(cat.items) ? cat.items : [];
    for (const item of items) menuMap[item.name] = item.menu_item_id;
  }

  console.log(`  existing groups: ${Object.keys(groupMap).length}`);
  console.log(`  menu items: ${Object.keys(menuMap).length}`);

  // ----------------------------------------------------------------
  // สร้าง modifier groups + modifiers
  // ----------------------------------------------------------------
  for (const g of MODIFIER_GROUPS) {
    let groupId = groupMap[g.name];

    if (!groupId) {
      // สร้าง group
      const r = await api("POST", "/menu/modifier-groups", {
        name: g.name,
        selection_type: g.selectionType,
        is_required: g.isRequired,
      }, token);
      groupId = r.data.modifier_group_id;
      groupMap[g.name] = groupId;
      console.log(`\n  ✓ group: ${g.name} (${g.selectionType}, required=${g.isRequired})`);
    } else {
      console.log(`\n  = group exists: ${g.name}`);
    }

    // ดึง modifier ที่มีอยู่แล้วในกลุ่มนี้
    const adminRefresh = await api("GET", "/menu/admin", null, token);
    const refreshedGroup = (adminRefresh.data?.modifier_groups ?? []).find(
      (grp) => grp.modifier_group_id === groupId
    );
    const existingModNames = new Set(
      Array.isArray(refreshedGroup?.modifiers)
        ? refreshedGroup.modifiers.map((m) => m.name)
        : []
    );

    // สร้าง modifiers
    for (const mod of g.modifiers) {
      if (existingModNames.has(mod.name)) {
        console.log(`    = skip modifier: ${mod.name}`);
        continue;
      }
      try {
        await api("POST", "/menu/modifiers", {
          modifier_group_id: groupId,
          name: mod.name,
          price_delta: mod.priceDelta,
        }, token);
        const priceStr = mod.priceDelta > 0 ? `+฿${mod.priceDelta}` : mod.priceDelta < 0 ? `฿${mod.priceDelta}` : "ฟรี";
        console.log(`    ✓ modifier: ${mod.name} (${priceStr})`);
      } catch (e) {
        console.log(`    ✗ modifier ${mod.name}: ${e.message}`);
      }
    }
  }

  // ----------------------------------------------------------------
  // ผูก modifier groups กับ menu items
  // ----------------------------------------------------------------
  console.log("\n--- ผูก modifier กับเมนู ---");

  // สร้าง map เมนู→กลุ่มที่ควรมี
  const menuToGroups = {}; // menuItemId → Set<groupId>
  for (const g of MODIFIER_GROUPS) {
    const groupId = groupMap[g.name];
    if (!groupId) continue;
    for (const menuName of g.linkMenuNames) {
      const menuId = menuMap[menuName];
      if (!menuId) { console.log(`  ✗ ไม่พบเมนู: ${menuName}`); continue; }
      if (!menuToGroups[menuId]) menuToGroups[menuId] = new Set();
      menuToGroups[menuId].add(groupId);
    }
  }

  // ดึง modifier_group_ids ปัจจุบันของแต่ละเมนู
  const fullRes = await api("GET", "/menu/full", null, token);
  const currentLinks = {}; // menuItemId → Set<groupId>
  for (const cat of fullRes.data?.categories ?? []) {
    for (const item of cat.items ?? []) {
      currentLinks[item.menu_item_id] = new Set(item.modifier_group_ids ?? []);
    }
  }

  // PUT /menu/items/:id/modifier-groups เฉพาะเมนูที่ต้องการผูก
  for (const [menuId, wantedGroupIds] of Object.entries(menuToGroups)) {
    const currentGroupIds = currentLinks[menuId] ?? new Set();
    // รวม existing + new (ไม่ลบของเก่า)
    const merged = new Set([...currentGroupIds, ...wantedGroupIds]);
    const mergedArr = [...merged];

    // หาชื่อเมนู
    const menuName = Object.entries(menuMap).find(([, id]) => id === menuId)?.[0] ?? menuId;

    try {
      await api("PUT", `/menu/items/${menuId}/modifier-groups`, {
        modifier_group_ids: mergedArr,
      }, token);
      const newOnes = mergedArr.filter((id) => !currentGroupIds.has(id)).length;
      const groupNames = MODIFIER_GROUPS
        .filter((g) => wantedGroupIds.has(groupMap[g.name]))
        .map((g) => g.name)
        .join(", ");
      console.log(`  ✓ ${menuName} → [${groupNames}]${newOnes > 0 ? ` (+${newOnes} ใหม่)` : " (ไม่เปลี่ยน)"}`);
    } catch (e) {
      console.log(`  ✗ ${menuName}: ${e.message}`);
    }
  }

  // ----------------------------------------------------------------
  // สรุป
  // ----------------------------------------------------------------
  console.log("\n--- สรุป ---");
  const finalFull = await api("GET", "/menu/full", null, token);
  for (const cat of finalFull.data?.categories ?? []) {
    console.log(`\n[${cat.name}]`);
    for (const item of cat.items ?? []) {
      const groupCount = (item.modifier_group_ids ?? []).length;
      const tag = groupCount > 0 ? `(${groupCount} modifier group)` : "(ไม่มี modifier)";
      console.log(`  ${item.name} ${tag}`);
    }
  }
})();
