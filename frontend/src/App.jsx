import { useState, createContext } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import CropDetail from './pages/CropDetail';
import Borewell from './pages/Borewell';
import Market from './pages/Market';
import Weather from './pages/Weather';
import History from './pages/History';
import Chat from './pages/Chat';

export const FarmContext = createContext(null);

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#10b981', light: '#34d399', dark: '#059669' },
    secondary: { main: '#0284c7' },
    background: { default: '#070d0a', paper: '#0e1713' },
    text: { primary: '#f8fafc', secondary: '#cbd5e1' }
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
  },
  shape: { borderRadius: 14 }
});

function App() {
  const [farmData, setFarmDataState] = useState(null);
  const [location, setLocation] = useState(null);
  const [sessionAnalyzed, setSessionAnalyzed] = useState(false);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState(null);

  const setFarmData = (data, isNewAnalysis = true) => {
    setFarmDataState(data);
    if (data && isNewAnalysis) {
      setSessionAnalyzed(true);
      setLastAnalyzedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <FarmContext.Provider value={{ farmData, setFarmData, location, setLocation, sessionAnalyzed, setSessionAnalyzed, lastAnalyzedAt }}>
        <BrowserRouter>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--color-bg)' }}>
            <Navbar />
            <main className="app-main-content" style={{ flex: 1, overflowY: 'auto' }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/crop/:name" element={<CropDetail />} />
                <Route path="/borewell" element={<Borewell />} />
                <Route path="/market" element={<Market />} />
                <Route path="/weather" element={<Weather />} />
                <Route path="/history" element={<History />} />
                <Route path="/chat" element={<Chat />} />
              </Routes>
            </main>
            <BottomNav />
          </div>
        </BrowserRouter>
      </FarmContext.Provider>
    </ThemeProvider>
  );
}

export default App;
