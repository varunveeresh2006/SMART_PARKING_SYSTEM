import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import BuildIcon from '@mui/icons-material/Build';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SecurityIcon from '@mui/icons-material/Security';
import QrCodeIcon from '@mui/icons-material/QrCode';
import { supabase } from '../lib/supabase';
import type { ParkingFloor } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface FloorStats {
  floor: ParkingFloor;
  available: number;
  occupied: number;
  reserved: number;
  not_available: number;
  notAvailable: number;
  total: number;
}

const statusColors: Record<string, string> = {
  available: '#2e7d32',
  occupied: '#c62828',
  reserved: '#e65100',
  not_available: '#424242',
};

const features = [
  { icon: <QrCodeIcon sx={{ fontSize: 32 }} />, title: 'QR-Based Entry', desc: 'Scan QR code at entry for seamless parking access' },
  { icon: <AccessTimeIcon sx={{ fontSize: 32 }} />, title: 'Real-Time Updates', desc: 'Live slot availability updated every minute' },
  { icon: <SecurityIcon sx={{ fontSize: 32 }} />, title: '24/7 Security', desc: 'Round-the-clock CCTV surveillance and security' },
  { icon: <DirectionsCarIcon sx={{ fontSize: 32 }} />, title: 'Multi-Vehicle', desc: 'Support for cars, bikes, SUVs and EVs' },
];

export default function HomePage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [floorStats, setFloorStats] = useState<FloorStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data: floors } = await supabase.from('parking_floors').select('*').order('floor_code');
      if (!floors) { setLoading(false); return; }

      const statsPromises = floors.map(async (floor) => {
        const { data: slots } = await supabase
          .from('parking_slots')
          .select('status')
          .eq('floor_id', floor.id);

        const counts = { available: 0, occupied: 0, reserved: 0, not_available: 0 };
        (slots ?? []).forEach(s => {
          counts[s.status as keyof typeof counts] = (counts[s.status as keyof typeof counts] || 0) + 1;
        });
        return {
          floor,
          ...counts,
          notAvailable: counts.not_available,
          total: (slots ?? []).length,
        };
      });

      setFloorStats(await Promise.all(statsPromises));
      setLoading(false);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalStats = floorStats.reduce(
    (acc, f) => ({
      available: acc.available + f.available,
      occupied: acc.occupied + f.occupied,
      reserved: acc.reserved + f.reserved,
      notAvailable: acc.notAvailable + f.notAvailable,
      total: acc.total + f.total,
    }),
    { available: 0, occupied: 0, reserved: 0, notAvailable: 0, total: 0 } as { available: number; occupied: number; reserved: number; notAvailable: number; total: number }
  );

  const statCards = [
    { label: 'Available', value: totalStats.available, color: '#2e7d32', bg: 'rgba(46,125,50,0.12)', icon: <CheckCircleIcon /> },
    { label: 'Occupied', value: totalStats.occupied, color: '#c62828', bg: 'rgba(198,40,40,0.12)', icon: <DirectionsCarIcon /> },
    { label: 'Reserved', value: totalStats.reserved, color: '#e65100', bg: 'rgba(230,81,0,0.12)', icon: <EventSeatIcon /> },
    { label: 'Maintenance', value: totalStats.notAvailable, color: '#616161', bg: 'rgba(97,97,97,0.12)', icon: <BuildIcon /> },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Hero Section */}
      <Box sx={{
        borderRadius: 3, mb: 3, p: { xs: 3, md: 4 },
        background: 'linear-gradient(135deg, rgba(13,71,161,0.8) 0%, rgba(21,101,192,0.6) 50%, rgba(0,150,136,0.4) 100%)',
        border: '1px solid rgba(100,181,246,0.2)',
        position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', top: -40, right: -40, opacity: 0.05 }}>
          <LocalParkingIcon sx={{ fontSize: 300 }} />
        </Box>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Chip
            label="LIVE" size="small" icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4caf50', animation: 'pulse 2s infinite', '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />}
            sx={{ mb: 2, bgcolor: 'rgba(76,175,80,0.2)', color: '#4caf50', fontWeight: 700 }}
          />
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}!
          </Typography>
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 3, fontWeight: 400 }}>
            Orion Mall Smart Parking — Whitefield, Bangalore
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained" size="large" startIcon={<BookOnlineIcon />}
              onClick={() => navigate('/book')}
              sx={{ fontWeight: 700 }}
            >
              Book a Slot
            </Button>
            <Button
              variant="outlined" size="large" startIcon={<DirectionsCarIcon />}
              onClick={() => navigate('/entry-exit')}
              sx={{ borderColor: 'rgba(100,181,246,0.4)', color: 'text.primary' }}
            >
              Vehicle Entry
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Total Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((s) => (
          <Grid size={{ xs: 6, sm: 3 }} key={s.label}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ color: s.color, display: 'flex' }}>{s.icon}</Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                    {s.label}
                  </Typography>
                </Box>
                {loading ? (
                  <Skeleton variant="text" width={60} height={40} />
                ) : (
                  <Typography variant="h4" sx={{ fontWeight: 700, color: s.color }}>
                    {s.value}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  of {totalStats.total} total slots
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Floor-wise Overview */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
        <LocationOnIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.light' }} />
        Floor-wise Availability
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {loading ? (
          [...Array(4)].map((_, i) => (
            <Grid size={{ xs: 12, sm: 6 }} key={i}>
              <Card><CardContent><Skeleton variant="rectangular" height={120} /></CardContent></Card>
            </Grid>
          ))
        ) : (
          floorStats.map((fs) => {
            const occupancyPct = fs.total > 0 ? Math.round(((fs.occupied + fs.reserved) / fs.total) * 100) : 0;
            const availPct = fs.total > 0 ? Math.round((fs.available / fs.total) * 100) : 0;
            return (
              <Grid size={{ xs: 12, sm: 6 }} key={fs.floor.id}>
                <Card
                  sx={{
                    cursor: 'pointer', transition: 'all 0.2s',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 32px rgba(21,101,192,0.2)' },
                  }}
                  onClick={() => navigate('/book', { state: { floorId: fs.floor.id } })}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          {fs.floor.floor_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {fs.floor.description}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${availPct}% Free`}
                        size="small"
                        sx={{
                          bgcolor: availPct > 50 ? 'rgba(46,125,50,0.2)' : availPct > 20 ? 'rgba(230,81,0,0.2)' : 'rgba(198,40,40,0.2)',
                          color: availPct > 50 ? '#4caf50' : availPct > 20 ? '#ff9800' : '#f44336',
                          fontWeight: 700,
                        }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      {[
                        { label: 'Available', val: fs.available, color: statusColors.available },
                        { label: 'Occupied', val: fs.occupied, color: statusColors.occupied },
                        { label: 'Reserved', val: fs.reserved, color: statusColors.reserved },
                        { label: 'N/A', val: fs.notAvailable, color: statusColors.not_available },
                      ].map(item => (
                        <Box key={item.label} sx={{ textAlign: 'center', flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: item.color, lineHeight: 1.2 }}>
                            {item.val}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                            {item.label}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    <LinearProgress
                      variant="determinate" value={occupancyPct}
                      sx={{
                        '& .MuiLinearProgress-bar': {
                          background: occupancyPct > 80 ? '#c62828' : occupancyPct > 50 ? '#e65100' : '#1565c0',
                        },
                        bgcolor: 'rgba(255,255,255,0.05)',
                      }}
                    />
                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
                      {occupancyPct}% Occupied
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })
        )}
      </Grid>

      {/* Features */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
        Smart Features
      </Typography>
      <Grid container spacing={2}>
        {features.map((f, i) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                <Box sx={{ color: 'primary.light', mb: 1.5 }}>{f.icon}</Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                  {f.title}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                  {f.desc}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Legend */}
      <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(100,181,246,0.08)' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, mr: 2, display: 'inline-block' }}>
          Slot Status:
        </Typography>
        {[
          { label: 'Available', color: '#4caf50' },
          { label: 'Occupied', color: '#f44336' },
          { label: 'Reserved', color: '#ff9800' },
          { label: 'Not Available', color: '#616161' },
        ].map(s => (
          <Box key={s.label} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mr: 2 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: s.color }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{s.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Footer info */}
      <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'rgba(21,101,192,0.08)', border: '1px solid rgba(21,101,192,0.15)' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          <BlockIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle', color: 'warning.main' }} />
          Some slots are marked "Not Available" due to maintenance or renovation work. This is expected behavior.
        </Typography>
      </Box>
    </Box>
  );
}
