import { AppRouter } from './routes/AppRouter';
import { KDSProvider } from './features/kds/context/KDSContext';
import { SalesProvider } from './features/saleReport/context/SalesContext';
import './App.css';

function App() {
  return (
    <SalesProvider>
      <KDSProvider>
        <AppRouter />
      </KDSProvider>
    </SalesProvider>
  );
}

export default App;
