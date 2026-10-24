# Seed menu data for test-a tenant
# Run from workspace root: .\backend\seed-menu.ps1

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$login = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
    -Method POST -ContentType "application/json; charset=utf-8" `
    -Body ([System.Text.Encoding]::UTF8.GetBytes('{"tenantSlug":"test-a","username":"owner_a","password":"12345678"}'))
$token = $login.accessToken
Write-Host "Logged in"

function Invoke-Api($method, $path, $bodyObj) {
    $json = $bodyObj | ConvertTo-Json -Compress -Depth 5
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    return Invoke-RestMethod -Uri "http://localhost:3000/api$path" `
        -Method $method `
        -ContentType "application/json; charset=utf-8" `
        -Headers @{Authorization="Bearer $token"} `
        -Body $bytes
}

# ----------------------------------------------------------------
# 1. ลบหมวดที่ charset เสีย แล้ว disable ทิ้ง
# ----------------------------------------------------------------
$cats = (Invoke-Api "GET" "/menu/category" $null).data
foreach ($c in $cats) {
    if ($c.name -match "^\?+$") {
        Write-Host "Disable broken category: $($c.category_id)"
        Invoke-Api "PATCH" "/menu/category/$($c.category_id)/disable" $null | Out-Null
    }
}

# ----------------------------------------------------------------
# 2. สร้างหมวดที่ขาด (skip ถ้ามีอยู่แล้ว)
# ----------------------------------------------------------------
$cats = (Invoke-Api "GET" "/menu/category" $null).data
$catNames = $cats | ForEach-Object { $_.name }

$wantedCats = @(
    @{ name = "อาหารจานหลัก"; sort_order = 0 }
    @{ name = "ของทานเล่น";   sort_order = 1 }
    @{ name = "ของหวาน";      sort_order = 2 }
    @{ name = "เครื่องดื่ม";  sort_order = 3 }
)

$catMap = @{}
foreach ($c in $cats) { $catMap[$c.name] = $c.category_id }

foreach ($w in $wantedCats) {
    if (-not $catMap.ContainsKey($w.name)) {
        $r = Invoke-Api "POST" "/menu/category" @{ name = $w.name }
        $catMap[$w.name] = $r.data.category_id
        Write-Host "Created category: $($w.name)"
    } else {
        Write-Host "Exists category:  $($w.name)"
    }
}

# ----------------------------------------------------------------
# 3. เมนู
# ----------------------------------------------------------------
$menus = @(
    # อาหารจานหลัก
    @{ cat="อาหารจานหลัก"; name="ข้าวผัดกุ้ง";         price=85;  desc="ข้าวผัดกุ้งแม่น้ำ ใส่ไข่" }
    @{ cat="อาหารจานหลัก"; name="ข้าวผัดหมู";          price=70;  desc="ข้าวผัดหมูสับ ใส่ผักชีฝรั่ง" }
    @{ cat="อาหารจานหลัก"; name="ข้าวผัดปู";           price=95;  desc="ข้าวผัดปูอ่าว" }
    @{ cat="อาหารจานหลัก"; name="ผัดกระเพราหมูสับ";    price=75;  desc="ผัดกระเพราหมูสับ ใส่ไข่ดาว" }
    @{ cat="อาหารจานหลัก"; name="ผัดกระเพราไก่";       price=70;  desc="ผัดกระเพราไก่ ใส่ไข่ดาว" }
    @{ cat="อาหารจานหลัก"; name="ผัดซีอิ๊วหมู";        price=70;  desc="ผัดซีอิ๊วหมูกรอบ เส้นใหญ่" }
    @{ cat="อาหารจานหลัก"; name="ราดหน้าหมู";          price=75;  desc="ราดหน้าหมูกรอบ เส้นใหญ่" }
    @{ cat="อาหารจานหลัก"; name="ต้มยำกุ้ง";           price=120; desc="ต้มยำกุ้งน้ำข้น กุ้ง 3 ตัว" }
    @{ cat="อาหารจานหลัก"; name="แกงเขียวหวานไก่";     price=90;  desc="แกงเขียวหวานไก่ หน่อไม้" }
    @{ cat="อาหารจานหลัก"; name="ข้าวมันไก่";          price=65;  desc="ข้าวมันไก่ต้ม น้ำซุป พร้อมซอส" }

    # ของทานเล่น
    @{ cat="ของทานเล่น"; name="ปอเปี๊ยะทอด";         price=55;  desc="ปอเปี๊ยะทอด 5 ชิ้น ราดซอสหวาน" }
    @{ cat="ของทานเล่น"; name="เต้าหู้ทอด";          price=50;  desc="เต้าหู้ทอดกรอบ ราดซอสถั่ว" }
    @{ cat="ของทานเล่น"; name="ไก่ทอด";              price=80;  desc="ไก่ทอดกรอบ 4 ชิ้น" }
    @{ cat="ของทานเล่น"; name="คอหมูย่าง";           price=85;  desc="คอหมูย่างเกาหลี จิ้มแจ่ว" }
    @{ cat="ของทานเล่น"; name="หมูปิ้ง";             price=45;  desc="หมูปิ้ง 3 ไม้ ข้าวเหนียว" }
    @{ cat="ของทานเล่น"; name="ไส้กรอกอีสาน";        price=60;  desc="ไส้กรอกอีสาน 4 ชิ้น จิ้มแจ่ว" }
    @{ cat="ของทานเล่น"; name="ทอดมันปลากราย";       price=70;  desc="ทอดมันปลากราย 5 ชิ้น ราดซอสพริก" }

    # ของหวาน
    @{ cat="ของหวาน"; name="ไอศกรีมกะทิ";           price=45;  desc="ไอศกรีมกะทิโฮมเมด ราดข้าวเหนียวมูน" }
    @{ cat="ของหวาน"; name="บัวลอยน้ำขิง";           price=50;  desc="บัวลอยไข่หวานน้ำขิง" }
    @{ cat="ของหวาน"; name="ข้าวเหนียวมะม่วง";       price=65;  desc="ข้าวเหนียวมูนมะม่วงสุก" }
    @{ cat="ของหวาน"; name="วุ้นมะพร้าว";            price=40;  desc="วุ้นมะพร้าวน้ำหอม" }
    @{ cat="ของหวาน"; name="ขนมครองแครง";            price=45;  desc="ขนมครองแครงใส่มะพร้าวอ่อน" }
    @{ cat="ของหวาน"; name="โรตีกล้วยหอม";           price=55;  desc="โรตีทอดกล้วยหอม ราดนมข้น" }

    # เครื่องดื่ม
    @{ cat="เครื่องดื่ม"; name="ชาไทยเย็น";          price=45;  desc="ชาไทยเย็น หวานปกติ" }
    @{ cat="เครื่องดื่ม"; name="ชามะนาว";            price=40;  desc="ชามะนาวเย็น หวานน้อย" }
    @{ cat="เครื่องดื่ม"; name="น้ำส้มคั้น";          price=50;  desc="น้ำส้มคั้นสด แก้วใหญ่" }
    @{ cat="เครื่องดื่ม"; name="กาแฟเย็น";           price=50;  desc="กาแฟโบราณเย็น" }
    @{ cat="เครื่องดื่ม"; name="น้ำเปล่า";            price=15;  desc="น้ำดื่มบรรจุขวด 600ml" }
    @{ cat="เครื่องดื่ม"; name="น้ำอัดลม";            price=25;  desc="น้ำอัดลมกระป๋อง 325ml" }
    @{ cat="เครื่องดื่ม"; name="นมสด";               price=35;  desc="นมสดแบบกล่อง 200ml" }
    @{ cat="เครื่องดื่ม"; name="โกโก้เย็น";          price=55;  desc="โกโก้ผงเย็น ใส่นม" }
)

# ดึงเมนูที่มีอยู่แล้วเพื่อ skip ซ้ำ
$existingMenu = (Invoke-Api "GET" "/menu/admin" $null).data
$existingNames = @{}
foreach ($e in $existingMenu) { $existingNames[$e.name] = $true }

$created = 0; $skipped = 0
foreach ($m in $menus) {
    if ($existingNames.ContainsKey($m.name)) {
        Write-Host "SKIP: $($m.name)"
        $skipped++
        continue
    }
    $catId = $catMap[$m.cat]
    if (-not $catId) { Write-Host "NO CAT: $($m.cat)"; continue }
    try {
        $body = @{ categoryId=$catId; name=$m.name; price=$m.price; description=$m.desc }
        Invoke-Api "POST" "/menu/items" $body | Out-Null
        Write-Host "ADD: $($m.name) (฿$($m.price))"
        $created++
    } catch {
        Write-Host "ERR: $($m.name) - $_"
    }
}

Write-Host ""
Write-Host "Done: created=$created skipped=$skipped"
