import { useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../App';
import LanguageToggle from './LanguageToggle';
import MapIcon from '@mui/icons-material/Map';
import GrassIcon from '@mui/icons-material/Grass';
import StoreIcon from '@mui/icons-material/Store';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import HistoryIcon from '@mui/icons-material/History';
import WaterDropIcon from '@mui/icons-material/WaterDrop';

const navItems = [
  { path: '/', icon: <MapIcon fontSize="small" />, key: 'map', label: 'Map Analysis' },
  { path: '/dashboard', icon: <GrassIcon fontSize="small" />, key: 'crops', label: 'Dashboard' },
  { path: '/borewell', icon: <WaterDropIcon fontSize="small" />, key: 'borewell', label: 'Groundwater' },
  { path: '/chat', icon: <SmartToyIcon fontSize="small" />, key: 'chat', label: 'AI Advisory' },
  { path: '/market', icon: <StoreIcon fontSize="small" />, key: 'market', label: 'Mandi Market' },
  { path: '/weather', icon: <WbSunnyIcon fontSize="small" />, key: 'weather', label: 'Weather' },
  { path: '/history', icon: <HistoryIcon fontSize="small" />, key: 'history', label: 'Saved Plots' }
];

const STATE_CODES = {
  'Tamil Nadu': 'TN', 'Maharashtra': 'MH', 'Madhya Pradesh': 'MP', 'Gujarat': 'GJ',
  'Uttar Pradesh': 'UP', 'Karnataka': 'KA', 'Andhra Pradesh': 'AP', 'Rajasthan': 'RJ',
  'Punjab': 'PB', 'Telangana': 'TG', 'Kerala': 'KL', 'Haryana': 'HR',
  'West Bengal': 'WB', 'Bihar': 'BR', 'Odisha': 'OR'
};

export default function Navbar() {
  const { farmData, location } = useContext(FarmContext);
  const navigate = useNavigate();
  const currentPath = useLocation().pathname;
  const { t } = useTranslation();

  const district = farmData?.location?.district;
  const stateName = farmData?.location?.state;
  const stateCode = STATE_CODES[stateName] || stateName;

  const locString = district 
    ? `${district}, ${stateCode}`
    : location 
      ? `${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}`
      : null;

  const fullLocString = district ? `${district}, ${stateName}` : locString;

  return (
    <header style={{
      height: 64,
      background: '#FFFFFF',
      borderBottom: '1px solid #E6E4DC',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 1100,
      boxShadow: '0 1px 4px rgba(28, 40, 38, 0.04)'
    }}>
      {/* Brand logo & location badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div 
          onClick={() => navigate('/')} 
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #2E6F40, #3D8C52)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem',
            boxShadow: '0 2px 8px rgba(46, 111, 64, 0.25)'
          }}>
            🌱
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, lineHeight: 1.1, whiteSpace: 'nowrap', color: '#1C2826' }}>
              AgroPredict
            </h1>
            <span style={{ fontSize: '0.62rem', color: '#4A5D58', letterSpacing: '0.02em', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Your Farm's AI Assistant
            </span>
          </div>
        </div>

        {/* Location Indicator Pill */}
        {locString && (
          <div
            title={fullLocString}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: '#EBF4ED',
              border: '1px solid #C8E6C9',
              padding: '4px 10px', borderRadius: 20,
              fontSize: '0.72rem', color: '#2E6F40', fontWeight: 700,
              whiteSpace: 'nowrap', maxWidth: 220, cursor: 'default'
            }}
          >
            <span>📍</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{locString}</span>
          </div>
        )}
      </div>

      {/* Desktop Navigation Links */}
      <nav className="hidden-mobile nav-scroll-container" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flexWrap: 'nowrap',
        overflowX: 'auto',
        maxWidth: '100%',
        padding: '2px 0'
      }}>
        {navItems.map(item => {
          const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
          return (
            <Link
              key={item.key}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: '0.82rem',
                fontWeight: isActive ? 700 : 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s ease',
                background: isActive ? '#EBF4ED' : 'transparent',
                color: isActive ? '#2E6F40' : '#4A5D58',
                border: isActive ? '1px solid #C8E6C9' : '1px solid transparent'
              }}
            >
              {item.icon}
              <span style={{ whiteSpace: 'nowrap' }}>{t(`nav.${item.key}`) || item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="hidden-mobile" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#F4F8EC',
          border: '1px solid #D5E6BC',
          padding: '3px 10px', borderRadius: 12,
          fontSize: '0.68rem', color: '#4D7C1B', fontWeight: 700
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2E6F40' }} />
          <span>{t('common.engineActive', 'System Active')}</span>
        </div>
        <LanguageToggle />
      </div>
    </header>
  );
}
