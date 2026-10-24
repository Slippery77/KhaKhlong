// Seed menu data for test-a tenant
// Usage: node backend/seed-menu.mjs

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
// data
// ----------------------------------------------------------------
const CATEGORIES = [
  { name: "อาหารจานหลัก", sort_order: 0 },
  { name: "ของทานเล่น",   sort_order: 1 },
  { name: "ของหวาน",      sort_order: 2 },
  { name: "เครื่องดื่ม",  sort_order: 3 },
];

const MENUS = [
  // อาหารจานหลัก
  { cat: "อาหารจานหลัก", name: "ข้าวผัดกุ้ง",       price: 85,  desc: "ข้าวผัดกุ้งแม่น้ำ ใส่ไข่" },
  { cat: "อาหารจานหลัก", name: "ข้าวผัดหมู",        price: 70,  desc: "ข้าวผัดหมูสับ ใส่ผักชีฝรั่ง" },
  { cat: "อาหารจานหลัก", name: "ข้าวผัดปู",         price: 95,  desc: "ข้าวผัดปูอ่าว" },
  { cat: "อาหารจานหลัก", name: "ผัดกระเพราหมูสับ",  price: 75,  desc: "ผัดกระเพราหมูสับ ใส่ไข่ดาว" },
  { cat: "อาหารจานหลัก", name: "ผัดกระเพราไก่",     price: 70,  desc: "ผัดกระเพราไก่ ใส่ไข่ดาว" },
  { cat: "อาหารจานหลัก", name: "ผัดซีอิ๊วหมู",      price: 70,  desc: "ผัดซีอิ๊วหมูกรอบ เส้นใหญ่" },
  { cat: "อาหารจานหลัก", name: "ราดหน้าหมู",        price: 75,  desc: "ราดหน้าหมูกรอบ เส้นใหญ่" },
  { cat: "อาหารจานหลัก", name: "ต้มยำกุ้ง",         price: 120, desc: "ต้มยำกุ้งน้ำข้น กุ้ง 3 ตัว" },
  { cat: "อาหารจานหลัก", name: "แกงเขียวหวานไก่",   price: 90,  desc: "แกงเขียวหวานไก่ หน่อไม้" },
  { cat: "อาหารจานหลัก", name: "ข้าวมันไก่",        price: 65,  desc: "ข้าวมันไก่ต้ม น้ำซุป พร้อมซอส" },

  // ของทานเล่น
  { cat: "ของทานเล่น", name: "ปอเปี๊ยะทอด",        price: 55,  desc: "ปอเปี๊ยะทอด 5 ชิ้น ราดซอสหวาน" },
  { cat: "ของทานเล่น", name: "เต้าหู้ทอด",         price: 50,  desc: "เต้าหู้ทอดกรอบ ราดซอสถั่ว" },
  { cat: "ของทานเล่น", name: "ไก่ทอด",             price: 80,  desc: "ไก่ทอดกรอบ 4 ชิ้น" },
  { cat: "ของทานเล่น", name: "คอหมูย่าง",          price: 85,  desc: "คอหมูย่างเกาหลี จิ้มแจ่ว" },
  { cat: "ของทานเล่น", name: "หมูปิ้ง",            price: 45,  desc: "หมูปิ้ง 3 ไม้ ข้าวเหนียว" },
  { cat: "ของทานเล่น", name: "ไส้กรอกอีสาน",       price: 60,  desc: "ไส้กรอกอีสาน 4 ชิ้น จิ้มแจ่ว" },
  { cat: "ของทานเล่น", name: "ทอดมันปลากราย",      price: 70,  desc: "ทอดมันปลากราย 5 ชิ้น ราดซอสพริก" },

  // ของหวาน
  { cat: "ของหวาน", name: "ไอศกรีมกะทิ",          price: 45,  desc: "ไอศกรีมกะทิโฮมเมด ราดข้าวเหนียวมูน" },
  { cat: "ของหวาน", name: "บัวลอยน้ำขิง",          price: 50,  desc: "บัวลอยไข่หวานน้ำขิง" },
  { cat: "ของหวาน", name: "ข้าวเหนียวมะม่วง",      price: 65,  desc: "ข้าวเหนียวมูนมะม่วงสุก" },
  { cat: "ของหวาน", name: "วุ้นมะพร้าว",           price: 40,  desc: "วุ้นมะพร้าวน้ำหอม" },
  { cat: "ของหวาน", name: "ขนมครองแครง",           price: 45,  desc: "ขนมครองแครงใส่มะพร้าวอ่อน" },
  { cat: "ของหวาน", name: "โรตีกล้วยหอม",          price: 55,  desc: "โรตีทอดกล้วยหอม ราดนมข้น" },

  // เครื่องดื่ม
  { cat: "เครื่องดื่ม", name: "ชาไทยเย็น",         price: 45,  desc: "ชาไทยเย็น หวานปกติ" },
  { cat: "เครื่องดื่ม", name: "ชามะนาว",           price: 40,  desc: "ชามะนาวเย็น หวานน้อย" },
  { cat: "เครื่องดื่ม", name: "น้ำส้มคั้น",         price: 50,  desc: "น้ำส้มคั้นสด แก้วใหญ่" },
  { cat: "เครื่องดื่ม", name: "กาแฟเย็น",          price: 50,  desc: "กาแฟโบราณเย็น" },
  { cat: "เครื่องดื่ม", name: "น้ำเปล่า",           price: 15,  desc: "น้ำดื่มบรรจุขวด 600ml" },
  { cat: "เครื่องดื่ม", name: "น้ำอัดลม",           price: 25,  desc: "น้ำอัดลมกระป๋อง 325ml" },
  { cat: "เครื่องดื่ม", name: "นมสด",              price: 35,  desc: "นมสดแบบกล่อง 200ml" },
  { cat: "เครื่องดื่ม", name: "โกโก้เย็น",         price: 55,  desc: "โกโก้ผงเย็น ใส่นม" },
];

// ----------------------------------------------------------------
// main
// ----------------------------------------------------------------
(async () => {
  // 1. login
  const loginRes = await api("POST", "/auth/login", {
    tenantSlug: "test-a",
    username: "owner_a",
    password: "12345678",
  });
  const token = loginRes.accessToken;
  console.log("✓ Login OK");

  // 2. ดึง categories ที่มีอยู่
  const catRes = await api("GET", "/menu/category", null, token);
  const existingCats = catRes.data ?? [];

  // disable หมวดที่ชื่อเป็น ? (charset เสีย)
  for (const c of existingCats) {
    if (/^\?+$/.test(c.name)) {
      await api("PATCH", `/menu/category/${c.category_id}/disable`, null, token);
      console.log(`  disabled broken category: ${c.category_id}`);
    }
  }

  // reload หลัง disable
  const catRes2 = await api("GET", "/menu/category", null, token);
  const activeCats = catRes2.data ?? [];
  const catMap = {};
  for (const c of activeCats) catMap[c.name] = c.category_id;

  // 3. สร้างหมวดที่ขาด
  for (const w of CATEGORIES) {
    if (!catMap[w.name]) {
      const r = await api("POST", "/menu/category", { name: w.name }, token);
      catMap[w.name] = r.data.category_id;
      console.log(`  ✓ category: ${w.name}`);
    } else {
      console.log(`  = category exists: ${w.name}`);
    }
  }

  // 4. ดึงเมนูที่มีอยู่แล้ว (ทุกหมวด) — /menu/admin คืน { data: { categories: [...] } }
  const adminRes = await api("GET", "/menu/admin", null, token);
  const allCats = adminRes.data?.categories ?? [];
  const existingNames = new Set(
    allCats.flatMap((c) => {
      // items อาจเป็น string ว่าง หรือ array ขึ้นกับ response
      const items = Array.isArray(c.items) ? c.items : [];
      return items.map((m) => m.name);
    })
  );

  // 5. สร้างเมนู
  let created = 0, skipped = 0;
  for (const m of MENUS) {
    if (existingNames.has(m.name)) {
      console.log(`  = skip: ${m.name}`);
      skipped++;
      continue;
    }
    const catId = catMap[m.cat];
    if (!catId) {
      console.log(`  ✗ no category for: ${m.cat}`);
      continue;
    }
    try {
      await api(
        "POST",
        "/menu/items",
        { category_id: catId, name: m.name, price: m.price, description: m.desc },
        token,
      );
      console.log(`  ✓ ${m.cat} / ${m.name} (฿${m.price})`);
      created++;
    } catch (e) {
      console.log(`  ✗ ${m.name}: ${e.message}`);
    }
  }

  console.log(`\nDone: created=${created} skipped=${skipped}`);
})();
