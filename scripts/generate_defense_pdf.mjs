import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

const htmlContent = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>คู่มือเตรียมสอบจบโปรเจกต์ — KhaKhlong POS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
    }
    
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Sarabun', 'Segoe UI', Tahoma, sans-serif;
      font-size: 13.5px;
      line-height: 1.55;
      color: #2D241E;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
    }

    h1, h2, h3, h4, .brand-font {
      font-family: 'Kanit', sans-serif;
    }

    /* Cover / Header */
    .header-box {
      background: linear-gradient(135deg, #FAF7F2 0%, #F3ECE4 100%);
      border: 1.5px solid #8C6D58;
      border-radius: 12px;
      padding: 18px 24px;
      margin-bottom: 20px;
      box-shadow: 0 2px 6px rgba(140, 109, 88, 0.08);
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #D9C6B0;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }

    .project-title {
      font-size: 26px;
      font-weight: 700;
      color: #8C6D58;
      margin: 0;
    }

    .project-subtitle {
      font-size: 14px;
      color: #6B5446;
      font-weight: 500;
      margin-top: 2px;
    }

    .badge-doc {
      background-color: #8C6D58;
      color: #ffffff;
      font-size: 11px;
      font-weight: 600;
      padding: 5px 12px;
      border-radius: 20px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .header-info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      font-size: 12px;
    }

    .info-item strong {
      color: #8C6D58;
      display: block;
      margin-bottom: 2px;
    }

    /* Section Styles */
    .section-title {
      font-size: 17px;
      font-weight: 700;
      color: #ffffff;
      background: #8C6D58;
      padding: 7px 14px;
      border-radius: 8px;
      margin-top: 22px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-title .section-num {
      background: rgba(255, 255, 255, 0.25);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 13px;
    }

    /* Q&A Card */
    .qa-card {
      background: #ffffff;
      border: 1px solid #E8DFD5;
      border-left: 4px solid #8C6D58;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .question {
      font-family: 'Kanit', sans-serif;
      font-size: 14.5px;
      font-weight: 600;
      color: #2D241E;
      margin-bottom: 8px;
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .q-badge {
      background-color: #8C6D58;
      color: white;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .answer {
      font-size: 13px;
      color: #3D322B;
    }

    .answer ul {
      margin: 4px 0 6px 0;
      padding-left: 18px;
    }

    .answer li {
      margin-bottom: 4px;
    }

    /* Highlight Key Insight */
    .key-point {
      background: #FAF7F2;
      border: 1px dashed #C8B8A6;
      border-radius: 6px;
      padding: 8px 12px;
      margin-top: 8px;
      font-size: 12.5px;
      color: #4A3A2F;
    }

    .key-point strong {
      color: #8C6D58;
    }

    /* Tags */
    .tag {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 4px;
      margin-right: 4px;
      text-transform: uppercase;
    }

    .tag-arch { background: #E8F0FE; color: #1967D2; }
    .tag-sec { background: #E6F4EA; color: #137333; }
    .tag-fin { background: #FEF7E0; color: #B06000; }
    .tag-pwa { background: #FCE8E6; color: #C5221F; }

    /* Demo Checklist Table */
    .demo-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 12.5px;
      break-inside: avoid;
    }

    .demo-table th {
      background: #FAF7F2;
      color: #8C6D58;
      border: 1px solid #D9C6B0;
      padding: 7px 10px;
      text-align: left;
      font-family: 'Kanit', sans-serif;
    }

    .demo-table td {
      border: 1px solid #E8DFD5;
      padding: 7px 10px;
      vertical-align: top;
    }

    .step-badge {
      background: #8C6D58;
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 11px;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    .footer-note {
      text-align: center;
      font-size: 11px;
      color: #8C6D58;
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px dashed #D9C6B0;
    }
  </style>
</head>
<body>

  <!-- HEADER / COVER -->
  <div class="header-box">
    <div class="header-top">
      <div>
        <h1 class="project-title">KhaKhlong POS (ค้าคล่อง)</h1>
        <div class="project-subtitle">Progressive Web Application Point-of-Sale System for Restaurants</div>
      </div>
      <div>
        <span class="badge-doc">Project Defense Cheat Sheet</span>
      </div>
    </div>
    <div class="header-info-grid">
      <div class="info-item">
        <strong>สถาปัตยกรรมระบบ</strong>
        React 18 + NestJS 11 + PostgreSQL 18
      </div>
      <div class="info-item">
        <strong>ความปลอดภัย</strong>
        RLS Multi-tenancy + RBAC + PIN Lock
      </div>
      <div class="info-item">
        <strong>ออฟไลน์ & ซิงก์</strong>
        PWA + Dexie (IndexedDB) + Outbox
      </div>
      <div class="info-item">
        <strong>สถานะโปรเจกต์</strong>
        เสร็จสมบูรณ์ 100% (P0 / P1 / P2 ครบ)
      </div>
    </div>
  </div>

  <!-- SECTION 1 -->
  <div class="section-title">
    <span class="section-num">หมวดที่ 1</span>
    ภาพรวมโปรเจกต์ ปัญหา และจุดเด่น (Problem Statement & Value Proposition)
  </div>

  <div class="qa-card">
    <div class="question">
      <span class="q-badge">Q1</span>
      ทำไมถึงทำโปรเจกต์นี้? POS ในท้องตลาดมีเยอะมาก ทำไมต้องทำเอง และมีจุดเด่นอย่างไร?
      <span class="tag tag-arch">Strategy</span>
    </div>
    <div class="answer">
      <ul>
        <li><strong>ลดต้นทุนอุปกรณ์ (Hardware Agnostic & Zero License Fee):</strong> POS ทั่วไปในท้องตลาดมักผูกขาดกับฮาร์ดแวร์เฉพาะ (เช่น บังคับซื้อเครื่อง POS เฉพาะทางราคาแพง หรือผูกกับ iPad) แต่ <em>KhaKhlong</em> พัฒนาเป็น <strong>PWA (Progressive Web App)</strong> ใช้งานได้ผ่านเว็บเบราว์เซอร์บนทุกอุปกรณ์ ทั้งคอมพิวเตอร์ตั้งโต๊ะ, แท็บเล็ต, สมาร์ตโฟน และรองรับเครื่องพิมพ์ใบเสร็จความร้อนทั้ง 80mm และ 58mm</li>
        <li><strong>คุ้มครองความปลอดภัยและป้องกันการทุจริต (Anti-Fraud & Audit Compliance):</strong> ปัญหาใหญ่ที่สุดของร้านอาหารคือการทุจริตจากการยกเลิกบิล (Void), ให้ส่วนลด/อาหารฟรี (Comp) และเงินในเก๊ะหาย ระบบเราบังคับใช้ <strong>Two-Person PIN Rule</strong> (ผู้จัดการ/เจ้าของร้านต้องใส่ PIN อนุมัติ), มีระบบล็อกรหัสผ่าน/PIN เมื่อกดผิด, และบันทึก <strong>Audit Logs</strong> ละเอียดทุกขั้นตอน</li>
        <li><strong>ทนทานต่อเน็ตหลุด (Offline-First Order Resilience):</strong> รองรับการสั่งอาหารและเปิดโต๊ะได้ต่อเนื่องแม้สัญญาณเน็ตจะขาดหายชั่วคราว ข้อมูลไม่สูญหายและซิงก์ขึ้นเซิร์ฟเวอร์อัตโนมัติเมื่อออนไลน์</li>
      </ul>
      <div class="key-point">
        <strong>จุดที่เน้นตอบอาจารย์:</strong> เราไม่ได้สร้างแค่โปรแกรมคิดเงิน แต่สร้าง <em>"ระบบควบคุมการเงินและความปลอดภัยของร้านอาหารที่เข้าถึงง่าย ต้นทุนต่ำ แต่มีเสถียรภาพระดับ Enterprise"</em>
      </div>
    </div>
  </div>

  <div class="qa-card">
    <div class="question">
      <span class="q-badge">Q2</span>
      ผู้ใช้งานในระบบมีใครบ้าง และแบ่งสิทธิ์ (Roles & Permissions) อย่างไร?
      <span class="tag tag-sec">RBAC</span>
    </div>
    <div class="answer">
      ระบบใช้โมเดล <strong>RBAC (Role-Based Access Control)</strong> แบ่งออกเป็น 3 บทบาทหลัก:
      <ul>
        <li><strong>Owner (เจ้าของร้าน):</strong> สิทธิ์สูงสุด จัดการข้อมูลร้าน, จัดการผู้ใช้งานและพนักงาน, ดูรายงานยอดขายภาพรวมทั้งหมด, ตรวจรับรองกะการเงิน (Verify Shift), และเข้าถึงประวัติความปลอดภัย (Audit Logs)</li>
        <li><strong>Manager (ผู้จัดการร้าน):</strong> บริหารจัดการเมนู, หมวดหมู่, โต๊ะอาหาร, อนุมัติรายการ Void/Comp ด้วย PIN, และตรวจสอบกะการเงินของพนักงาน</li>
        <li><strong>Employee (พนักงาน/แคชเชียร์):</strong> สิทธิ์จำกัดเฉพาะหน้างาน (9 สิทธิ์) ได้แก่ เปิดบิล, รับออเดอร์ส่งครัว, ชำระเงิน, ดูเฉพาะกะของตนเอง (<code>report:view_own_shift</code>) แต่ไม่มีสิทธิ์ยกเลิกบิลหรือดูข้อมูลความปลอดภัย</li>
      </ul>
      <div class="key-point">
        <strong>การบังคับใช้สิทธิ์:</strong> คุ้มครองทั้งฝั่ง Backend ด้วย <code>@RequirePermissions</code> / <code>@RequireAnyPermission</code> และฝั่ง Frontend ด้วย <code>RouteGuard</code> และ Dynamic UI Elements
      </div>
    </div>
  </div>

  <!-- SECTION 2 -->
  <div class="section-title">
    <span class="section-num">หมวดที่ 2</span>
    สถาปัตยกรรมระบบและเทคโนโลยี (Architecture & Multi-Tenancy)
  </div>

  <div class="qa-card">
    <div class="question">
      <span class="q-badge">Q3</span>
      ทำไมถึงเลือกใช้ Tech Stack ชุดนี้? (React, NestJS, PostgreSQL 18, Dexie)
      <span class="tag tag-arch">Tech Stack</span>
    </div>
    <div class="answer">
      <ul>
        <li><strong>Frontend (React 18 + Vite + Tailwind v4):</strong> ได้ความเร็วสูงในการคอมไพล์ (Vite HMR), Type Safety เต็มรูปแบบด้วย TypeScript, Tailwind v4 ให้ UI ที่ตอบสนองลื่นไหล โทนคาเฟ่อบอุ่น (Warm Coffee) และออกแบบสอดคล้องกับหลัก Human Interface Guidelines สำหรับงานสัมผัส (Touch POS)</li>
        <li><strong>Backend (NestJS 11):</strong> โครงสร้างแบบ Enterprise Modular Architecture แบ่งแยก Controller &rarr; Service &rarr; Repository ชัดเจน มี Dependency Injection (DI) และ DTO Validation ช่วยให้ทดสอบง่ายและขยายระบบได้ยั่งยืน</li>
        <li><strong>Database (PostgreSQL 18):</strong> มีความสมบูรณ์ด้านธุรกรรมแบบ ACID สูง รองรับ Row-Level Security (RLS) ที่แข็งแกร่ง และมี DB Trigger/View ช่วยคำนวณภาษีและยอดเงินได้อย่างแม่นยำ</li>
        <li><strong>Client Database (Dexie.js / IndexedDB):</strong> เป็น Local Database ในเบราว์เซอร์ สำหรับแคช Snapshot เมนู ผังโต๊ะ และจัดการคิวคำสั่งสั่งอาหารออฟไลน์ (Outbox Queue)</li>
      </ul>
    </div>
  </div>

  <div class="qa-card">
    <div class="question">
      <span class="q-badge">Q4</span>
      ระบบจัดการแยกข้อมูลร้านค้า (Multi-tenancy) อย่างไร? ป้องกันข้อมูลรั่วไหลได้อย่างไร?
      <span class="tag tag-sec">RLS Highlight</span>
    </div>
    <div class="answer">
      <ul>
        <li>เราเลือกใช้สถาปัตยกรรม <strong>Shared Database, Shared Schema with Row-Level Security (RLS)</strong> ของ PostgreSQL</li>
        <li>ทุกตารางที่มีข้อมูลของร้านจะมีคอลัมน์ <code>tenant_id</code> กำกับ และเปิดใช้ RLS ผ่านฟังก์ชัน <code>app_tenant_id()</code></li>
        <li><strong>กระบวนการทำงาน:</strong> เมื่อ Client ส่งคำขอพร้อม JWT &rarr; Backend จะถอดรหัส Token และเซ็ตค่า Session Variable (<code>SET LOCAL app.current_tenant_id = ...</code>) ใน PostgreSQL Connection นั้น</li>
        <li>PostgreSQL จะบังคับกรองข้อมูลให้เห็นเฉพาะร้านนั้นโดยอัตโนมัติในระดับ Database Engine <strong>แม้ผู้พัฒนาจะเผลอเขียนคำสั่ง SELECT/UPDATE โดยไม่ได้ใส่ <code>WHERE tenant_id = ...</code> ข้อมูลก็ไม่มีวันรั่วไหลข้ามร้านเด็ดขาด (Zero Data Leakage)</strong></li>
      </ul>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- SECTION 3 -->
  <div class="section-title">
    <span class="section-num">หมวดที่ 3</span>
    ความปลอดภัยและการควบคุมธุรกรรม (Security, Auth & Concurrency)
  </div>

  <div class="qa-card">
    <div class="question">
      <span class="q-badge">Q5</span>
      ระบบป้องกันการทุจริต Void / Comp และบิลลูกค้าหนี (Walkout) ทำงานอย่างไร?
      <span class="tag tag-sec">Fraud Prevention</span>
    </div>
    <div class="answer">
      <ul>
        <li><strong>Two-Person PIN Rule:</strong> พนักงานแคชเชียร์เป็นผู้กดเลือกรายการที่จะ Void (ยกเลิก) หรือ Comp (ให้ฟรี) แต่ระบบจะแสดง Modal บังคับให้ป้อน <strong>PIN 6 หลักของผู้จัดการหรือเจ้าของร้าน</strong> พร้อมระบุเหตุผล</li>
        <li><strong>Approver Invariant:</strong> ในฐานข้อมูลจะบันทึก <code>voided_by</code> หรือ <code>comped_by</code> เป็น User ID ของ <strong>"ผู้อนุมัติ"</strong> เพื่อให้สามารถตรวจสอบย้อนหลังได้ชัดเจนว่าใครเป็นคนอนุมัติ</li>
        <li><strong>Close Unpaid (Walkout):</strong> หากลูกค้าหนีโต๊ะ มีเส้นทางปิดบิลพิเศษที่ต้องใช้ PIN ผู้อนุมัติและบันทึกหมายเหตุ เพื่อให้ระบบปิดบิลและคืนสถานะโต๊ะกลับเป็นว่าง (Available) ได้อย่างถูกต้องโดยไม่ทำให้โต๊ะค้างสถานะ Occupied ตลอดไป</li>
      </ul>
    </div>
  </div>

  <div class="qa-card">
    <div class="question">
      <span class="q-badge">Q6</span>
      ทำไมต้องมี <code>durableQuery</code> ในการนับจำนวนครั้งที่กด PIN ผิด? (ไฮไลท์เชิงเทคนิค!)
      <span class="tag tag-sec">Architecture Highlight</span>
    </div>
    <div class="answer">
      <ul>
        <li><strong>ปัญหาเดิม:</strong> เมื่อพนักงานใส่ PIN อนุมัติผิด Backend จะส่ง <code>403 Forbidden</code> ทำให้ Database ทำการ <strong>Rollback Transaction</strong> ทั้งหมด ส่งผลให้ตัวนับจำนวนครั้งที่ใส่รหัสผิด (Failed Attempts) ถูก Rollback หายไปด้วย ทำให้ผู้ร้ายสามารถสุ่มเดา PIN (Brute-force) ได้ไม่จำกัดครั้ง!</li>
        <li><strong>วิธีแก้เชิงวิศวกรรม:</strong> เราสร้าง <code>DbContextService.durableQuery()</code> ที่ใช้ Database Connection พิเศษทำงานนอก Transaction ของคำขอนั้น ทำหน้าที่เขียนตัวนับ <code>pin_failed_attempts</code> ลงตาราง <code>users</code> อย่างคงทนถาวร</li>
        <li>เมื่อใส่ PIN ผิดครบ 5 ครั้ง ระบบจะตั้งเวลาล็อกบัญชี 5 นาที (ส่งสถานะ <code>429 Too Many Requests</code>) อย่างแท้จริง ข้าม Session และข้ามการ Restart เซิร์ฟเวอร์</li>
      </ul>
    </div>
  </div>

  <div class="qa-card">
    <div class="question">
      <span class="q-badge">Q7</span>
      Authentication ใช้ JWT แล้วจัดการเรื่อง Logout หรือเปลี่ยนรหัสผ่านอย่างไร? (Token Revocation)
      <span class="tag tag-sec">Auth Pattern</span>
    </div>
    <div class="answer">
      <ul>
        <li>ปกติ JWT เป็น Stateless ทำให้ไม่สามารถยกเลิก Token กลางคันก่อนหมดอายุได้</li>
        <li>เราแก้ปัญหานี้ด้วย <strong><code>token_version</code> Pattern:</strong> ในฐานข้อมูลตาราง <code>users</code> จะมีคอลัมน์ <code>token_version</code> (ตัวเลขจำนวนเต็ม) และใส่ค่านี้ไว้ใน Payload ของ JWT</li>
        <li>เมื่อผู้ใช้เปลี่ยนรหัสผ่าน, รีเซ็ตรหัสผ่าน หรือถูก Deactivate บัญชี ระบบจะเพิ่มค่า <code>token_version = token_version + 1</code> ในฐานข้อมูลทันที</li>
        <li>เมื่อ Token เก่าส่งเข้ามาที่ <code>jwtAuth.guard.ts</code> จะถูกตรวจสอบกับค่าในฐานข้อมูล หากเวอร์ชันไม่ตรงกันจะถูกปฏิเสธทันที (Session เก่าจะหลุดหมดทั้งระบบ)</li>
      </ul>
    </div>
  </div>

  <!-- SECTION 4 -->
  <div class="section-title">
    <span class="section-num">หมวดที่ 4</span>
    การเงิน การคำนวณ และการปิดกะ (Financial Invariants & Shifts)
  </div>

  <div class="qa-card">
    <div class="question">
      <span class="q-badge">Q8</span>
      "ทำไมถึงห้ามคำนวณ VAT, Service Charge และยอดรวมใน NestJS หรือ Client?"
      <span class="tag tag-fin">Core Invariant</span>
    </div>
    <div class="answer">
      <ul>
        <li><strong>Single Source of Truth:</strong> ป้องกันปัญหาการปัดเศษทศนิยม (Rounding Differences) ที่ไม่ตรงกันระหว่าง JavaScript (IEEE 754 Floating Point) และ Database</li>
        <li><strong>Tamper-Proof Security:</strong> ป้องกันไม่ให้ฝั่ง Client หรือ API Caller แอบแก้ไขยอดเงิน ยอดภาษี หรือส่วนลดผ่าน Network Payload</li>
        <li><strong>Database Engine Responsibility:</strong> ฐานข้อมูล PostgreSQL ผ่าน View <code>v_order_item_totals</code> และ Database Trigger เป็นผู้คำนวณยอดรวม, ส่วนลด, Service Charge, VAT 7%, และยอดปัดเศษสตางค์ตามกฎหมาย พร้อมทำ Snapshot บันทึกอัตราภาษีลงใบเสร็จ ณ วินาทีที่ชำระเงิน</li>
      </ul>
    </div>
  </div>

  <div class="qa-card">
    <div class="question">
      <span class="q-badge">Q9</span>
      กระบวนการชำระเงิน (Payment Workflow) ทำงานอย่างไร? ทำไมต้องมี Payment Attempt?
      <span class="tag tag-fin">2-Phase Pattern</span>
    </div>
    <div class="answer">
      เราใช้สถาปัตยกรรมแบบ <strong>2-Phase Payment Attempt</strong> เพื่อความสมบูรณ์ทางการเงิน:
      <ul>
        <li><strong>ขั้นที่ 1 (จองบิล):</strong> เมื่อกดปุ่มคิดเงิน Frontend จะเรียก <code>POST /payments/attempts</code> เพื่อให้เซิร์ฟเวอร์คำนวณยอดเงินสุทธิและทำการ <strong>Lock สถานะบิล</strong> ป้องกันไม่ให้มีการสั่งอาหารเพิ่ม หรือกดชำระเงินซ้ำซ้อนจากเครื่องอื่นพร้อมกัน (Double Payment Prevention)</li>
        <li><strong>ขั้นที่ 2 (รับเงิน/ปิดบิล):</strong> แคชเชียร์เลือกวิธีชำระ (เงินสด หรือ QR PromptPay) แล้วยืนยันผ่าน <code>POST .../attempts/:id/pay</code> เมื่อชำระสำเร็จ Trigger จะปิดบิล, ออกเลขที่ใบเสร็จทางการ และคืนสถานะโต๊ะเป็นว่าง (Available) อัตโนมัติ</li>
        <li><strong>กรณียกเลิก:</strong> หากลูกค้าเปลี่ยนใจหรือปิด Modal ชำระเงิน Frontend จะเรียก <code>POST .../attempts/:id/cancel</code> เสมอเพื่อปลดล็อกบิลกลับสู่สภาพเดิม</li>
      </ul>
    </div>
  </div>

  <div class="qa-card">
    <div class="question">
      <span class="q-badge">Q10</span>
      ระบบกะการเงิน (Shift Management) ควบคุมเงินสดในร้านอย่างไร?
      <span class="tag tag-fin">Cash Control</span>
    </div>
    <div class="answer">
      <ul>
        <li><strong>เปิดกะ (Open Shift):</strong> บังคับป้อนเงินทอนตั้งต้น (Opening Cash)</li>
        <li><strong>สมุดเงินสด (Cashbook):</strong> ทุกการขายเงินสด, เงินเข้า (Cash In) และเบิกเงินออก (Cash Out) จะถูกบันทึกความเคลื่อนไหวลงตาราง <code>cash_movements</code> แบบ Immutable</li>
        <li><strong>ปิดกะ (Close Shift & Blind Count):</strong> แคชเชียร์ต้องนับเงินสดจริงในเก๊ะมาป้อนโดยไม่แสดงยอดที่ระบบคาดหวังให้เห็นล่วงหน้า เพื่อป้องกันการตกแต่งตัวเลข
          <ul>
            <li>ถ้ายอดเงินตรง: กะจะปิดสมบูรณ์ทันที (Status: <code>closed</code>)</li>
            <li>ถ้ายอดขาดหรือเกิน: กะจะติดสถานะ <code>pending_verification</code> ต้องให้ Manager หรือ Owner ตรวจสอบและใส่ PIN ยืนยันรับทราบผลต่าง</li>
          </ul>
        </li>
        <li><strong>Shift Escalation Cron:</strong> หากกะติดสถานะรอตรวจสอบเกินกว่าเวลาที่ร้านตั้งไว้ (Default 4 ชม.) Background Job จะส่งต่อกะให้ Owner ตรวจสอบโดยตรงอัตโนมัติ</li>
      </ul>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- SECTION 5 -->
  <div class="section-title">
    <span class="section-num">หมวดที่ 5</span>
    การทำงานออฟไลน์และ PWA (Offline-First & PWA)
  </div>

  <div class="qa-card">
    <div class="question">
      <span class="q-badge">Q11</span>
      PWA และ Offline Mode ทำงานอย่างไร? ข้อมูลหายไหมถ้าเน็ตหลุดกลางคัน?
      <span class="tag tag-pwa">Dexie & Outbox</span>
    </div>
    <div class="answer">
      <ul>
        <li><strong>Service Worker App Shell:</strong> ใช้ Workbox แคชไฟล์หน้าเว็บทั้งหมด ทำให้เปิดแอพได้ทันทีแม้ไม่มีอินเทอร์เน็ต</li>
        <li><strong>Local Snapshots (Dexie.js / IndexedDB):</strong> ข้อมูลเมนูอาหาร, ผังโต๊ะ และกะปัจจุบัน จะถูกแคชลง IndexedDB ในเครื่องด้วยกลยุทธ์ <em>Network-First Fallback</em> (ยิงเซิร์ฟเวอร์ก่อน หากเน็ตหลุดจะดึง snapshot ล่าสุดมาแสดงแทน)</li>
        <li><strong>Outbox Queue Pattern:</strong> หากพนักงานเปิดโต๊ะหรือสั่งอาหารขณะออฟไลน์ คำสั่งจะถูกบันทึกลง Dexie Outbox ทันที พร้อมทำ Optimistic Update ผังโต๊ะในเครื่อง เพื่อให้พนักงานสั่งอาหารเพิ่มที่โต๊ะเดิมต่อได้</li>
        <li><strong>Atomic Synchronization (Web Locks):</strong> เมื่อเน็ตกลับมาออนไลน์ <code>OutboxRunner</code> จะวนลูปส่งคำสั่งขึ้นเซิร์ฟเวอร์ตามลำดับ (FIFO) โดยใช้ <strong>Web Locks API</strong> ป้องกันไม่ให้หลายแท็บเบราว์เซอร์แย่งกันส่งข้อมูลชนกัน</li>
        <li><strong>Data Guard:</strong> ระบบมี Guard บล็อกการ Logout, ปิดกะ หรืออัปเดต Service Worker หากยังมีคำสั่งค้างอยู่ใน Outbox เพื่อป้องกันข้อมูลสูญหาย 100%</li>
      </ul>
    </div>
  </div>

  <div class="qa-card">
    <div class="question">
      <span class="q-badge">Q12</span>
      ทำไมถึงไม่อนุญาตให้คิดเงิน/ชำระเงิน (Payment) ขณะออฟไลน์?
      <span class="tag tag-pwa">Financial Decision</span>
    </div>
    <div class="answer">
      เป็นการตัดสินใจเชิงธุรกิจและความปลอดภัยทางการเงิน (Financial Integrity):
      <ul>
        <li><strong>ความถูกต้องของเงินจริง:</strong> การชำระเงินจำเป็นต้องยืนยันยอดเงินจริง (เช่น เงินสดเข้าเก๊ะ หรือ QR PromptPay ที่ลูกค้าโอนจริง)</li>
        <li><strong>Sequential Receipt Numbering:</strong> เลขที่ใบเสร็จทางการของร้านอาหารตามกฎหมายต้องรันต่อเนื่องห้ามซ้ำและห้ามกระโดด ซึ่งต้องให้ Database ศูนย์กลางเป็นผู้ออกเลข</li>
        <li><strong>ป้องกันพนักงานทุจริต:</strong> หากเปิดให้ออฟไลน์แคชเชียร์อาจรับเงินสดจากลูกค้าแล้วล้างแคชทิ้งโดยไม่ซิงก์ข้อมูล</li>
        <li><strong>สรุป:</strong> ระบบจึงอนุญาตให้ออฟไลน์เฉพาะการ <em>"รับออเดอร์และส่งครัว"</em> ส่วนการคิดเงินต้องทำแบบ Online เท่านั้น</li>
      </ul>
    </div>
  </div>

  <!-- SECTION 6 -->
  <div class="section-title">
    <span class="section-num">หมวดที่ 6</span>
    การทดสอบและการประกันคุณภาพ (Testing & QA)
  </div>

  <div class="qa-card">
    <div class="question">
      <span class="q-badge">Q13</span>
      คุณทดสอบโปรเจกต์นี้อย่างไรเพื่อยืนยันว่าระบบทำงานถูกต้องและพร้อมใช้งานจริง?
      <span class="tag tag-arch">Quality Assurance</span>
    </div>
    <div class="answer">
      <ul>
        <li><strong>Compile & Type Safety:</strong> ผ่านการตรวจสอบ Type 100% ทั้งฝั่ง Backend (<code>tsc --noEmit</code>) และ Frontend (<code>tsc -b</code>)</li>
        <li><strong>Unit Tests (Jest):</strong> ทดสอบฟังก์ชันและเซอร์วิสที่มีความซับซ้อน เช่น การเปลี่ยนสถานะกะ, การตรวจสอบ PIN, และ Shift Escalation Service</li>
        <li><strong>End-to-End Tests (Node.js <code>.mjs</code>):</strong> เราพัฒนาชุดทดสอบ E2E เขียนเป็นสคริปต์ Node.js รันยิงคำขอกับ NestJS และ PostgreSQL จริงมากกว่า 13 ชุดทดสอบ ครอบคลุม Business Critical Flows เช่น:
          <ul>
            <li><code>e2e-void-comp.mjs</code>: ทดสอบสิทธิ์ PIN อนุมัติ Void/Comp และการถูกล็อกบัญชี 31 ข้อผ่านครบ 100%</li>
            <li><code>e2e-cancel-order.mjs</code>: ทดสอบการยกเลิกบิลและลูกค้าหนี (Walkout)</li>
            <li><code>e2e-merge-tables-payment.mjs</code>: ทดสอบการรวมหลายโต๊ะคิดเงินพร้อมกัน</li>
            <li><code>e2e-token-version.mjs</code>: ทดสอบการตัดเซสชันเมื่อเปลี่ยนรหัสผ่าน</li>
            <li><code>e2e-audit-logs.mjs</code>, <code>e2e-receipt.mjs</code>, <code>e2e-printer-config.mjs</code>, <code>e2e-category-reorder.mjs</code></li>
          </ul>
        </li>
      </ul>
    </div>
  </div>

  <!-- DEMO FLOW SUMMARY -->
  <div class="section-title">
    <span class="section-num">โบนัส</span>
    ขั้นตอนการสาธิตหน้าห้องสอบที่แนะนำ (5-Step Demo Script)
  </div>

  <table class="demo-table">
    <thead>
      <tr>
        <th style="width: 12%;">ขั้นตอน</th>
        <th style="width: 25%;">หน้าจอ / การกระทำ</th>
        <th style="width: 38%;">สิ่งที่ต้องอธิบายให้อาจารย์ฟัง</th>
        <th style="width: 25%;">ไฮไลท์เทคโนโลยี</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="step-badge">Step 1</span></td>
        <td><strong>Store Finder & Login</strong><br>เข้าผ่าน URL ร้าน และเปิดกะ</td>
        <td>แสดงระบบ Multi-tenant ผ่าน URL slug และการเปิดกะระบุเงินทอนตั้งต้น (Opening Cash)</td>
        <td>Tenant Isolation + Shift Management</td>
      </tr>
      <tr>
        <td><span class="step-badge">Step 2</span></td>
        <td><strong>ผังโต๊ะ & สั่งอาหาร</strong><br>เลือกโต๊ะ สั่งเมนู + ตัวเลือก (Modifier)</td>
        <td>แสดง UI ตอบสนองรวดเร็ว การเลือกเมนู ตัวเลือกเสริม และการส่งครัว</td>
        <td>Optimistic UI + KDS Sync</td>
      </tr>
      <tr>
        <td><span class="step-badge">Step 3</span></td>
        <td><strong>Void / Comp อนุมัติ</strong><br>ขอยกเลิกหรือให้ฟรี</td>
        <td>แสดง Modal ขอ PIN ผู้จัดการ อธิบายเรื่องการบันทึกสิทธิ์ผู้อนุมัติ และระบบป้องกัน PIN ผิดด้วย durableQuery</td>
        <td>Two-Person Rule + Fraud Prevention</td>
      </tr>
      <tr>
        <td><span class="step-badge">Step 4</span></td>
        <td><strong>คิดเงิน & พิมพ์ใบเสร็จ</strong><br>ชำระเงินสด / QR Code</td>
        <td>แสดง 2-Phase Payment Attempt ยอดเงินถูกคำนวณจาก DB Trigger โต๊ะคืนสถานะว่างอัตโนมัติ และแสดงใบเสร็จ 80mm/58mm</td>
        <td>Financial Integrity + Thermal Print</td>
      </tr>
      <tr>
        <td><span class="step-badge">Step 5</span></td>
        <td><strong>สลับเป็น Owner ดู Audit</strong><br>ประวัติความปลอดภัย & รายงาน</td>
        <td>แสดง Audit Logs ที่บันทึกการกระทำเมื่อครู่ และหน้ารายงานยอดขายตามกะ/ช่วงเวลา พร้อมส่งออก CSV ภาษาไทยไม่เพี้ยน</td>
        <td>Audit Compliance + CSV Export UTF-8 BOM</td>
      </tr>
    </tbody>
  </table>

  <div class="footer-note">
    จัดทำขึ้นสำหรับโปรเจกต์ KhaKhlong (ค้าคล่อง) — ขอให้การสอบจบโปรเจกต์ผ่านพ้นไปด้วยคะแนนยอดเยี่ยม!
  </div>

</body>
</html>
`;

async function main() {
  const tempHtml = path.join(os.tmpdir(), 'khakhlong_defense_qa.html');
  const tempPdf = path.join(os.tmpdir(), 'khakhlong_defense_qa.pdf');
  
  fs.writeFileSync(tempHtml, htmlContent, 'utf-8');
  console.log('Generated HTML at:', tempHtml);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  
  console.log('Rendering PDF via Chrome headless...');
  const cmd = `"${chromePath}" --headless=new --disable-gpu --no-sandbox --print-to-pdf-no-header --print-to-pdf="${tempPdf}" "${tempHtml}"`;
  execSync(cmd, { stdio: 'inherit' });

  if (!fs.existsSync(tempPdf)) {
    throw new Error('PDF failed to generate');
  }

  const stat = fs.statSync(tempPdf);
  console.log(`PDF successfully created! Size: ${stat.size} bytes`);

  // Target destinations
  const rootDest = path.resolve('คู่มือเตรียมสอบจบ_ค้าคล่อง_POS.pdf');
  const docsDest = path.resolve('docs/KhaKhlong_POS_Defense_QA_Guide.pdf');

  fs.copyFileSync(tempPdf, rootDest);
  fs.copyFileSync(tempPdf, docsDest);

  console.log('Saved to:', rootDest);
  console.log('Saved to:', docsDest);

  // Clean temp files
  try {
    fs.unlinkSync(tempHtml);
    fs.unlinkSync(tempPdf);
  } catch (e) {
    // ignore
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
