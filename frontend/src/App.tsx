import { AppRouter } from './routes/AppRouter';
import { KDSProvider } from './features/kds/context/KDSContext';
import { SalesProvider } from './features/saleReport/context/SalesContext';
import UpdatePrompt from './features/offline/components/UpdatePrompt';
import OfflineBanner from './features/offline/components/offlineBanner';
import OutboxRunner from './features/offline/components/OutboxRunner';   // [ใหม่]

import './App.css';

function App() {
  return (
    <SalesProvider>
      <KDSProvider>
        <AppRouter />
        <UpdatePrompt />
        <OfflineBanner/>
        <OutboxRunner/>
      </KDSProvider>
    </SalesProvider>
  );
}

export default App;
