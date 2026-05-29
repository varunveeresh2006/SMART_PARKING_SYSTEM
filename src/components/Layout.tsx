import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import PaymentIcon from '@mui/icons-material/Payment';
import HistoryIcon from '@mui/icons-material/History';
import DashboardIcon from '@mui/icons-material/Dashboard';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import StorageIcon from '@mui/icons-material/Storage';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const DRAWER_WIDTH = 260;

const navItems = [
  { label: 'Home', icon: <HomeIcon />, path: '/' },
  { label: 'Book Parking', icon: <BookOnlineIcon />, path: '/book' },
  { label: 'Vehicle Entry/Exit', icon: <DirectionsCarIcon />, path: '/entry-exit' },
  { label: 'Payment', icon: <PaymentIcon />, path: '/payment' },
  { label: 'Booking History', icon: <HistoryIcon />, path: '/history' },
];

const adminItems = [
  { label: 'Admin Dashboard', icon: <DashboardIcon />, path: '/admin' },
  { label: 'Database Viewer', icon: <StorageIcon />, path: '/admin/database' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut, isAdmin } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <LocalParkingIcon sx={{ color: 'primary.light', fontSize: 32 }} />
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
            Orion Mall
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Smart Parking System
          </Typography>
        </Box>
        <IconButton size="small" onClick={() => setDrawerOpen(false)} sx={{ ml: 'auto' }}>
          <ChevronLeftIcon />
        </IconButton>
      </Box>

      <Box sx={{ px: 2, py: 1.5 }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
          borderRadius: 2, bgcolor: 'rgba(21,101,192,0.12)',
          border: '1px solid rgba(100,181,246,0.1)',
        }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14 }}>
            {profile?.full_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'U'}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }} noWrap>
              {profile?.full_name || 'User'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
              {user?.email}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider />

      <List sx={{ px: 1, flex: 1 }}>
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                onClick={() => setDrawerOpen(false)}
                selected={active}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'rgba(21,101,192,0.2)',
                    '&:hover': { bgcolor: 'rgba(21,101,192,0.25)' },
                  },
                }}
              >
                <ListItemIcon sx={{ color: active ? 'primary.light' : 'text.secondary', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: active ? 600 : 400, color: active ? 'text.primary' : 'text.secondary' }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}

        {isAdmin && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', px: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Admin
            </Typography>
            {adminItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <ListItem key={item.path} disablePadding sx={{ mb: 0.5, mt: 0.5 }}>
                  <ListItemButton
                    component={Link}
                    to={item.path}
                    onClick={() => setDrawerOpen(false)}
                    selected={active}
                    sx={{
                      borderRadius: 2,
                      '&.Mui-selected': {
                        bgcolor: 'rgba(0,150,136,0.2)',
                        '&:hover': { bgcolor: 'rgba(0,150,136,0.25)' },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: active ? 'secondary.main' : 'text.secondary', minWidth: 40 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: active ? 600 : 400, color: active ? 'text.primary' : 'text.secondary' }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </>
        )}
      </List>

      <Divider />
      <List sx={{ px: 1, py: 0.5 }}>
        <ListItem disablePadding>
          <ListItemButton onClick={handleSignOut} sx={{ borderRadius: 2 }}>
            <ListItemIcon sx={{ color: 'error.main', minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Sign Out" primaryTypographyProps={{ variant: 'body2', color: 'error.main', fontWeight: 600 }} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          bgcolor: 'rgba(5,13,26,0.92)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(100,181,246,0.1)',
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton color="inherit" edge="start" onClick={() => setDrawerOpen(true)}>
            <MenuIcon />
          </IconButton>

          <LocalParkingIcon sx={{ color: 'primary.light', mr: 0.5 }} />
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ fontWeight: 700, color: 'text.primary', textDecoration: 'none', flexGrow: 1, display: { xs: 'none', sm: 'block' } }}
          >
            Orion Mall Parking
          </Typography>
          <Typography
            variant="subtitle1"
            component={Link}
            to="/"
            sx={{ fontWeight: 700, color: 'text.primary', textDecoration: 'none', flexGrow: 1, display: { xs: 'block', sm: 'none' } }}
          >
            OMP
          </Typography>

          <Tooltip title="Notifications">
            <IconButton color="inherit" onClick={() => navigate('/notifications')} sx={{ position: 'relative' }}>
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {isAdmin && (
            <Tooltip title="Admin Panel">
              <IconButton color="inherit" onClick={() => navigate('/admin')}>
                <AdminPanelSettingsIcon sx={{ color: 'secondary.main' }} />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Account">
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                {profile?.full_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'U'}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            PaperProps={{ sx: { mt: 1, minWidth: 180, bgcolor: 'background.paper' } }}
          >
            <MenuItem disabled>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {profile?.full_name || user?.email}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/history'); }}>
              <ListItemIcon><HistoryIcon fontSize="small" /></ListItemIcon>
              My Bookings
            </MenuItem>
            <MenuItem onClick={() => { setAnchorEl(null); handleSignOut(); }}>
              <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
              <Typography color="error">Sign Out</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            border: 'none',
            borderRight: '1px solid rgba(100,181,246,0.1)',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          mt: '64px',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
