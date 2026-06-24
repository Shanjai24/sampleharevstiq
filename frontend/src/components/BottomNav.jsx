import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import MapIcon from '@mui/icons-material/Map';
import GrassIcon from '@mui/icons-material/Grass';
import StoreIcon from '@mui/icons-material/Store';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import SmartToyIcon from '@mui/icons-material/SmartToy';

const navItems = [
  { path: '/', icon: <MapIcon />, key: 'map' },
  { path: '/dashboard', icon: <GrassIcon />, key: 'crops' },
  { path: '/chat', icon: <SmartToyIcon />, key: 'chat' },
  { path: '/market', icon: <StoreIcon />, key: 'market' },
  { path: '/weather', icon: <WbSunnyIcon />, key: 'weather' }
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const currentIndex = navItems.findIndex(item => item.path === location.pathname);

  return (
    <BottomNavigation
      value={currentIndex >= 0 ? currentIndex : 0}
      onChange={(_, newValue) => navigate(navItems[newValue].path)}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: 64,
        background: 'rgba(10, 15, 13, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(34, 197, 94, 0.15)'
      }}
    >
      {navItems.map(item => (
        <BottomNavigationAction
          key={item.key}
          label={t(`nav.${item.key}`)}
          icon={item.icon}
          sx={{
            color: 'rgba(96, 125, 108, 0.8)',
            '&.Mui-selected': { color: '#22c55e' },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.65rem',
              fontWeight: 500
            }
          }}
        />
      ))}
    </BottomNavigation>
  );
}
