import { useState, createContext } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import BottomNav from './components/BottomNav';
import LanguageToggle from './components/LanguageToggle';
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
    primary: { main: '#16a34a', light: '#22c55e', dark: '#15803d' },
    secondary: { main: '#0ea5e9' },
    background: { default: '#0a0f0d', paper: 'rgba(20, 30, 24, 0.85)' }
  },
  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
  },
  shape: { borderRadius: 12 }
});

function App() {
  const [farmData, setFarmData] = useState(null);
  const [location, setLocation] = useState(null);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <FarmContext.Provider value={{ farmData, setFarmData, location, setLocation }}>
        <BrowserRouter>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <LanguageToggle />
            <div style={{ flex: 1, overflow: 'auto', paddingBottom: '64px' }}>
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
            </div>
            <BottomNav />
          </div>
        </BrowserRouter>
      </FarmContext.Provider>
    </ThemeProvider>
  );
}

export default App;
