import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './features/auth/context/AuthContext.tsx';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { requestPersistentStorage } from './features/offline/db';
import { startConnectionMonitor } from './features/offline/connectionStatus';

// ขอให้ browser ไม่ลบข้อมูลออฟไลน์ (IndexedDB) เองตอนพื้นที่เครื่องใกล้เต็ม
requestPersistentStorage();
// ดูสถานะเน็ต/เซิร์ฟเวอร์ตลอดอายุแอป (ป้าย OfflineBanner อ่านผลจากตัวนี้)
startConnectionMonitor();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
