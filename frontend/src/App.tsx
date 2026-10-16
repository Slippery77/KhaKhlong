import { AppRouter } from './routes/AppRouter';
import { KDSProvider } from './features/kds/context/KDSContext';
import './App.css';

function App() {
  return (
    <KDSProvider>
      <AppRouter />
    </KDSProvider>
  );
}

export default App;
