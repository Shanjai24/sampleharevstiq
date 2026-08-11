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
  { path: '/dashboard', icon: <GrassIcon fontSize="small" />, key: 'crops', label: 'Crops' },
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
      height: 60,
      background: '#FFFFFF',
      borderTop: '1px solid #E6E4DC',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      padding: '0 8px',
      boxShadow: '0 -2px 10px rgba(28, 40, 38, 0.04)'
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
              padding: '6px 0',
              flex: 1,
              color: isActive ? '#2E6F40' : '#788A85',
              transition: 'all 0.15s ease',
              position: 'relative'
            }}
          >
            <div style={{
              transform: isActive ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform 0.15s ease'
            }}>
              {item.icon}
            </div>
            <span style={{
              fontSize: '0.62rem',
              fontWeight: isActive ? 700 : 500,
              marginTop: 2
            }}>
              {t(`nav.${item.key}`) || item.label}
            </span>
            {isActive && (
              <span style={{
                position: 'absolute',
                top: 0,
                width: 24,
                height: 2,
                borderRadius: 1,
                background: '#2E6F40'
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
