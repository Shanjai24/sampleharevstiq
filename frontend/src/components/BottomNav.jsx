import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MapIcon from '@mui/icons-material/Map';
import GrassIcon from '@mui/icons-material/Grass';
import StoreIcon from '@mui/icons-material/Store';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import WaterDropIcon from '@mui/icons-material/WaterDrop';

const navItems = [
  { path: '/', icon: <MapIcon fontSize="small" />, key: 'map', label: 'Map' },
  { path: '/dashboard', icon: <GrassIcon fontSize="small" />, key: 'crops', label: 'Dashboard' },
  { path: '/borewell', icon: <WaterDropIcon fontSize="small" />, key: 'borewell', label: 'Borewell' },
  { path: '/chat', icon: <SmartToyIcon fontSize="small" />, key: 'chat', label: 'AI Chat' },
  { path: '/market', icon: <StoreIcon fontSize="small" />, key: 'market', label: 'Market' },
  { path: '/weather', icon: <WbSunnyIcon fontSize="small" />, key: 'weather', label: 'Weather' }
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <div className="mobile-bottom-nav" style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      height: 64,
      background: '#FFFFFF',
      borderTop: '1px solid #E5E2D8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '0 4px',
      boxShadow: '0 -4px 16px rgba(24, 36, 32, 0.05)'
    }}>
      {navItems.map(item => {
        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 0',
              flex: 1,
              minHeight: 48,
              color: isActive ? '#1E5E3A' : '#748782',
              transition: 'all 0.15s ease',
              position: 'relative'
            }}
          >
            <div style={{
              transform: isActive ? 'scale(1.15)' : 'scale(1)',
              transition: 'transform 0.15s ease'
            }}>
              {item.icon}
            </div>
            <span style={{
              fontSize: '0.64rem',
              fontWeight: isActive ? 800 : 600,
              marginTop: 3
            }}>
              {t(`nav.${item.key}`) || item.label}
            </span>
            {isActive && (
              <span style={{
                position: 'absolute',
                top: 0,
                width: 28,
                height: 3,
                borderRadius: '0 0 3px 3px',
                background: '#1E5E3A'
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
