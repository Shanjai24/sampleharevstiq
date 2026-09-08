import { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../context/FarmContext';
import HistoryIcon from '@mui/icons-material/History';
import MapIcon from '@mui/icons-material/Map';
import GrassIcon from '@mui/icons-material/Grass';
import StoreIcon from '@mui/icons-material/Store';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import SmartToyIcon from '@mui/icons-material/SmartToy';

const navItems = [
  { path: '/', icon: <MapIcon fontSize="small" />, key: 'map', label: 'Map' },
  { path: '/dashboard', icon: <GrassIcon fontSize="small" />, key: 'crops', label: 'Dashboard' },
  { path: '/chat', icon: <SmartToyIcon fontSize="small" />, key: 'chat', label: 'AI Chat' },
  { path: '/market', icon: <StoreIcon fontSize="small" />, key: 'market', label: 'Market' },
  { path: '/weather', icon: <WbSunnyIcon fontSize="small" />, key: 'weather', label: 'Weather' },
  { path: '/history', icon: <HistoryIcon fontSize="small" />, key: 'history', label: 'History' }
];

export default function BottomNav() {
  const { sessionAnalyzed } = useContext(FarmContext) || {};
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  if (location.pathname === '/' && !sessionAnalyzed) {
    return null;
  }

  return (
    <div className="mobile-bottom-nav fixed right-0 bottom-0 left-0 z-[1000] flex h-16 items-center justify-between overflow-x-auto border-t border-border bg-surface px-0.5 shadow-[0_-4px_16px_rgba(24,36,32,0.05)]">
      {navItems.filter(item => item.key !== 'map').map(item => {
        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => navigate(item.path)}
            className={`relative flex min-h-11 flex-1 cursor-pointer flex-col items-center justify-center border-0 bg-transparent py-2 transition-all duration-150 ${
              isActive ? 'text-primary' : 'text-text-muted'
            }`}
          >
            <div className={`transition-transform duration-150 ${isActive ? 'scale-[1.15]' : 'scale-100'}`}>
              {item.icon}
            </div>
            <span className={`mt-0.5 text-[0.64rem] ${isActive ? 'font-extrabold' : 'font-semibold'}`}>
              {t(`nav.${item.key}`) || item.label}
            </span>
            {isActive && (
              <span className="absolute top-0 h-[3px] w-7 rounded-b-sm bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
