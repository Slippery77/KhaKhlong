import { AppRouter } from './routes/AppRouter';
import { KDSProvider } from './features/kds/context/KDSContext';
import { SalesProvider } from './features/saleReport/context/SalesContext';
import UpdatePrompt from './features/offline/components/UpdatePrompt';
import './App.css';

function App() {
  return (
    <SalesProvider>
      <KDSProvider>
        <AppRouter />
        <UpdatePrompt />
      </KDSProvider>
    </SalesProvider>
  );
}

export default App;
