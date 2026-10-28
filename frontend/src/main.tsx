import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './features/auth/context/AuthContext.tsx';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { requestPersistentStorage } from './features/offline/db';

// ขอให้ browser ไม่ลบข้อมูลออฟไลน์ (IndexedDB) เองตอนพื้นที่เครื่องใกล้เต็ม
requestPersistentStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
