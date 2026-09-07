import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import CropDetail from './pages/CropDetail';
import Market from './pages/Market';
import Weather from './pages/Weather';
import History from './pages/History';
import Chat from './pages/Chat';


import SchemesAndLoans from './pages/SchemesAndLoans';
import SellForProfit from './pages/SellForProfit';

import { FarmContext } from './context/FarmContext';

const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2E6F40', light: '#3D8C52', dark: '#1E4A2A' },
    secondary: { main: '#0284c7' },
    background: { default: '#FAF9F5', paper: '#FFFFFF' },
    text: { primary: '#1C2826', secondary: '#4A5D58' }
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
  },
  shape: { borderRadius: 14 }
});

function App() {
  const [farmData, setFarmDataState] = useState(() => {
    try {
      const saved = localStorage.getItem('agropredict_cached_farm');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [location, setLocationState] = useState(() => {
    try {
      const saved = localStorage.getItem('agropredict_cached_location');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [sessionAnalyzed, setSessionAnalyzed] = useState(false);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState(() => {
    return localStorage.getItem('agropredict_last_analyzed_at') || null;
  });

  const [areaAcres, setAreaAcresState] = useState(() => {
    try {
      const saved = localStorage.getItem('agropredict_cached_area');
      return saved ? parseFloat(saved) : 1.0;
    } catch {
      return 1.0;
    }
  });

  const setAreaAcres = (val) => {
    const num = Math.max(0.1, parseFloat(val) || 1.0);
    setAreaAcresState(num);
    try {
      localStorage.setItem('agropredict_cached_area', num.toString());
    } catch (e) {
      console.error(e);
    }
  };

  const setLocation = (loc) => {
    setLocationState(loc);
    if (loc) {
      try {
        localStorage.setItem('agropredict_cached_location', JSON.stringify(loc));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const setFarmData = (data, isNewAnalysis = true) => {
    setFarmDataState(data);
    if (data) {
      try {
        localStorage.setItem('agropredict_cached_farm', JSON.stringify(data));
        if (data.location) {
          setLocationState(data.location);
          localStorage.setItem('agropredict_cached_location', JSON.stringify(data.location));
        }
        if (data.areaAcres) {
          setAreaAcresState(data.areaAcres);
          localStorage.setItem('agropredict_cached_area', data.areaAcres.toString());
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (data && isNewAnalysis) {
      setSessionAnalyzed(true);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastAnalyzedAt(timeStr);
      try {
        localStorage.setItem('agropredict_last_analyzed_at', timeStr);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <FarmContext.Provider value={{ farmData, setFarmData, location, setLocation, areaAcres, setAreaAcres, sessionAnalyzed, setSessionAnalyzed, lastAnalyzedAt }}>
        <BrowserRouter>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--color-bg)' }}>
            <Navbar />
            <main className="app-main-content app-main" style={{ flex: 1, overflowY: 'auto' }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/crop/:name" element={<CropDetail />} />
                <Route path="/borewell" element={<Navigate to="/dashboard" replace />} />
                <Route path="/market" element={<Market />} />
                <Route path="/weather" element={<Weather />} />
                <Route path="/history" element={<History />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/schemes-loans" element={<SchemesAndLoans />} />
                <Route path="/sell-for-profit" element={<SellForProfit />} />

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
