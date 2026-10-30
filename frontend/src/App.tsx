import { AppRouter } from './routes/AppRouter';
import { KDSProvider } from './features/kds/context/KDSContext';
import { SalesProvider } from './features/saleReport/context/SalesContext';
import UpdatePrompt from './features/offline/components/UpdatePrompt';
import OfflineBanner from './features/offline/components/offlineBanner';
import './App.css';

function App() {
  return (
    <SalesProvider>
      <KDSProvider>
        <AppRouter />
        <UpdatePrompt />
        <OfflineBanner/>
      </KDSProvider>
    </SalesProvider>
  );
}

export default App;
