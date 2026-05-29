import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import PeopleIcon from '@mui/icons-material/People';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import StorageIcon from '@mui/icons-material/Storage';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { format, subDays } from 'date-fns';

interface DashboardStats {
  totalSlots: number;
  available: number;
  occupied: number;
  reserved: number;
  notAvailable: number;
  totalBookings: number;
  activeBookings: number;
  totalRevenue: number;
  penaltyRevenue: number;
  totalUsers: number;
  todayBookings: number;
  todayRevenue: number;
}

interface FloorOccupancy {
  name: string;
  available: number;
  occupied: number;
  reserved: number;
  total: number;
}

const COLORS = ['#4caf50', '#f44336', '#ff9800', '#616161'];

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [floorOccupancy, setFloorOccupancy] = useState<FloorOccupancy[]>([]);
  const [recentBookings, setRecentBookings] = useState<{id:string;vehicle_number:string;status:string;created_at:string;parking_slots?:{slot_number:string;parking_floors?:{floor_name:string}}}[]>([]);
  const [revenueData, setRevenueData] = useState<{day:string;revenue:number;bookings:number}[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    // Slot stats
    const { data: slots } = await supabase.from('parking_slots').select('status');
    const slotCounts = { available: 0, occupied: 0, reserved: 0, not_available: 0 };
    (slots ?? []).forEach(s => { slotCounts[s.status as keyof typeof slotCounts]++; });

    // Booking stats
    const { count: totalBookings } = await supabase.from('bookings').select('*', { count: 'exact', head: true });
    const { count: activeBookings } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).in('status', ['active', 'reserved']);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const { count: todayBookings } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString());

    // Payment stats
    const { data: payments } = await supabase.from('payments').select('total_amount, penalty_amount, paid_at').eq('payment_status', 'completed');
    const totalRevenue = (payments ?? []).reduce((s, p) => s + p.total_amount, 0);
    const penaltyRevenue = (payments ?? []).reduce((s, p) => s + p.penalty_amount, 0);
    const todayRevenue = (payments ?? []).filter(p => p.paid_at && new Date(p.paid_at) >= today).reduce((s, p) => s + p.total_amount, 0);

    // User count (via profiles)
    const { count: totalUsers } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true });

    setStats({
      totalSlots: (slots ?? []).length,
      available: slotCounts.available,
      occupied: slotCounts.occupied,
      reserved: slotCounts.reserved,
      notAvailable: slotCounts.not_available,
      totalBookings: totalBookings ?? 0,
      activeBookings: activeBookings ?? 0,
      totalRevenue,
      penaltyRevenue,
      totalUsers: totalUsers ?? 0,
      todayBookings: todayBookings ?? 0,
      todayRevenue,
    });
  };

  const fetchFloorOccupancy = async () => {
    const { data: floors } = await supabase.from('parking_floors').select('*, parking_slots(status)');
    if (!floors) return;
    const data: FloorOccupancy[] = floors.map(f => {
      const s = (f.parking_slots as {status:string}[]) ?? [];
      return {
        name: f.floor_code,
        available: s.filter(x => x.status === 'available').length,
        occupied: s.filter(x => x.status === 'occupied').length,
        reserved: s.filter(x => x.status === 'reserved').length,
        total: s.length,
      };
    });
    setFloorOccupancy(data);
  };

  const fetchRecentBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('id, vehicle_number, status, created_at, parking_slots(slot_number, parking_floors(floor_name))')
      .order('created_at', { ascending: false })
      .limit(8);
    setRecentBookings((data as unknown as typeof recentBookings) ?? []);
  };

  const fetchRevenueData = async () => {
    const days = [...Array(7)].map((_, i) => subDays(new Date(), 6 - i));
    const data = await Promise.all(days.map(async (day) => {
      const start = new Date(day); start.setHours(0, 0, 0, 0);
      const end = new Date(day); end.setHours(23, 59, 59, 999);
      const { data: ps } = await supabase.from('payments')
        .select('total_amount')
        .eq('payment_status', 'completed')
        .gte('paid_at', start.toISOString())
        .lte('paid_at', end.toISOString());
      const { count } = await supabase.from('bookings')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
      return {
        day: format(day, 'EEE'),
        revenue: (ps ?? []).reduce((s, p) => s + p.total_amount, 0),
        bookings: count ?? 0,
      };
    }));
    setRevenueData(data);
  };

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      await Promise.all([fetchStats(), fetchFloorOccupancy(), fetchRecentBookings(), fetchRevenueData()]);
      setLoading(false);
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Access denied. Admin privileges required.</Alert>
      </Box>
    );
  }

  const pieData = stats ? [
    { name: 'Available', value: stats.available },
    { name: 'Occupied', value: stats.occupied },
    { name: 'Reserved', value: stats.reserved },
    { name: 'N/A', value: stats.notAvailable },
  ] : [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
            <DashboardIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.light' }} />
            Admin Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Orion Mall Parking — Real-time Analytics
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label="LIVE"
            icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4caf50', animation: 'pulse 2s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />}
            sx={{ bgcolor: 'rgba(76,175,80,0.2)', color: '#4caf50', fontWeight: 700 }}
          />
          <Button variant="outlined" size="small" startIcon={<StorageIcon />} onClick={() => navigate('/admin/database')}>
            Database
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Slots', val: stats?.totalSlots, icon: <LocalParkingIcon />, color: '#42a5f5', bg: 'rgba(66,165,245,0.12)' },
          { label: 'Available', val: stats?.available, icon: <CheckCircleIcon />, color: '#66bb6a', bg: 'rgba(102,187,106,0.12)' },
          { label: 'Occupied', val: stats?.occupied, icon: <DirectionsCarIcon />, color: '#ef5350', bg: 'rgba(239,83,80,0.12)' },
          { label: 'Total Bookings', val: stats?.totalBookings, icon: <BookOnlineIcon />, color: '#ab47bc', bg: 'rgba(171,71,188,0.12)' },
          { label: 'Active Now', val: stats?.activeBookings, icon: <TrendingUpIcon />, color: '#26c6da', bg: 'rgba(38,198,218,0.12)' },
          { label: 'Users', val: stats?.totalUsers, icon: <PeopleIcon />, color: '#ffa726', bg: 'rgba(255,167,38,0.12)' },
          { label: 'Revenue', val: stats ? `₹${stats.totalRevenue.toFixed(0)}` : undefined, icon: <MonetizationOnIcon />, color: '#66bb6a', bg: 'rgba(102,187,106,0.12)' },
          { label: 'Penalties', val: stats ? `₹${stats.penaltyRevenue.toFixed(0)}` : undefined, icon: <WarningAmberIcon />, color: '#ff7043', bg: 'rgba(255,112,67,0.12)' },
        ].map((kpi) => (
          <Grid size={{ xs: 6, sm: 3 }} key={kpi.label}>
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color, '& svg': { fontSize: 18 } }}>
                    {kpi.icon}
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                    {kpi.label}
                  </Typography>
                </Box>
                {loading ? <Skeleton height={36} /> : (
                  <Typography variant="h5" sx={{ fontWeight: 700, color: kpi.color }}>
                    {kpi.val ?? 0}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Today Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Card sx={{ background: 'linear-gradient(135deg, rgba(13,71,161,0.4) 0%, rgba(21,101,192,0.3) 100%)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>Today's Bookings</Typography>
              {loading ? <Skeleton height={48} /> : <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.light' }}>{stats?.todayBookings}</Typography>}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Card sx={{ background: 'linear-gradient(135deg, rgba(27,94,32,0.4) 0%, rgba(46,125,50,0.3) 100%)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>Today's Revenue</Typography>
              {loading ? <Skeleton height={48} /> : <Typography variant="h3" sx={{ fontWeight: 700, color: 'success.main' }}>₹{stats?.todayRevenue.toFixed(0)}</Typography>}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Floor Occupancy Bar */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: 300 }}>
            <CardContent sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Floor-wise Occupancy</Typography>
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={floorOccupancy} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,181,246,0.08)" />
                  <XAxis dataKey="name" tick={{ fill: '#90caf9', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#90caf9', fontSize: 12 }} />
                  <RechartTooltip contentStyle={{ background: '#0a1929', border: '1px solid rgba(100,181,246,0.2)', borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="available" name="Available" fill="#4caf50" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="occupied" name="Occupied" fill="#f44336" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="reserved" name="Reserved" fill="#ff9800" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Pie */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: 300 }}>
            <CardContent sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Slot Distribution</Typography>
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <RechartTooltip contentStyle={{ background: '#0a1929', border: '1px solid rgba(100,181,246,0.2)', borderRadius: 8 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Revenue & Bookings Trend */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: 220 }}>
            <CardContent sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>7-Day Revenue Trend</Typography>
              <ResponsiveContainer width="100%" height="80%">
                <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1565c0" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#1565c0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,181,246,0.08)" />
                  <XAxis dataKey="day" tick={{ fill: '#90caf9', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#90caf9', fontSize: 11 }} />
                  <RechartTooltip contentStyle={{ background: '#0a1929', border: '1px solid rgba(100,181,246,0.2)', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#1565c0" fill="url(#revGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: 220 }}>
            <CardContent sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>7-Day Bookings Trend</Typography>
              <ResponsiveContainer width="100%" height="80%">
                <LineChart data={revenueData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,181,246,0.08)" />
                  <XAxis dataKey="day" tick={{ fill: '#90caf9', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#90caf9', fontSize: 11 }} />
                  <RechartTooltip contentStyle={{ background: '#0a1929', border: '1px solid rgba(100,181,246,0.2)', borderRadius: 8 }} />
                  <Line type="monotone" dataKey="bookings" stroke="#4db6ac" strokeWidth={2} dot={{ fill: '#4db6ac', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Floor Occupancy Bars */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {floorOccupancy.map(f => {
          const pct = f.total > 0 ? Math.round(((f.occupied + f.reserved) / f.total) * 100) : 0;
          return (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={f.name}>
              <Card>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{f.name}</Typography>
                    <Chip label={`${pct}%`} size="small" sx={{ bgcolor: pct > 80 ? 'rgba(198,40,40,0.2)' : pct > 50 ? 'rgba(230,81,0,0.2)' : 'rgba(46,125,50,0.2)', color: pct > 80 ? '#f44336' : pct > 50 ? '#ff9800' : '#4caf50', fontWeight: 700 }} />
                  </Box>
                  <LinearProgress variant="determinate" value={pct} sx={{ mb: 1, '& .MuiLinearProgress-bar': { bgcolor: pct > 80 ? '#f44336' : pct > 50 ? '#ff9800' : '#4caf50' } }} />
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {f.available} free / {f.total} total
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Recent Bookings Table */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Recent Activity</Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Vehicle</TableCell>
              <TableCell>Floor / Slot</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                </TableRow>
              ))
            ) : recentBookings.map((b) => {
              const sc: Record<string, { label: string; color: string; bg: string }> = {
                reserved: { label: 'Reserved', color: '#ff9800', bg: 'rgba(230,81,0,0.2)' },
                active: { label: 'Active', color: '#4caf50', bg: 'rgba(46,125,50,0.2)' },
                completed: { label: 'Completed', color: '#90caf9', bg: 'rgba(21,101,192,0.2)' },
                cancelled: { label: 'Cancelled', color: '#ef5350', bg: 'rgba(198,40,40,0.2)' },
              };
              const s = sc[b.status] ?? sc.reserved;
              return (
                <TableRow key={b.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: 'rgba(21,101,192,0.2)', fontSize: 12 }}>
                        <DirectionsCarIcon sx={{ fontSize: 14 }} />
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{b.vehicle_number}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {b.parking_slots?.parking_floors?.floor_name ?? '—'} / {b.parking_slots?.slot_number ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {format(new Date(b.created_at), 'dd/MM hh:mm a')}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
