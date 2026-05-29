import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import StorageIcon from '@mui/icons-material/Storage';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import PeopleIcon from '@mui/icons-material/People';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import PaymentIcon from '@mui/icons-material/Payment';
import NotificationsIcon from '@mui/icons-material/Notifications';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

type TableName = 'user_profiles' | 'vehicles' | 'parking_slots' | 'bookings' | 'payments' | 'notifications' | 'penalties';

interface TableConfig {
  name: TableName;
  label: string;
  icon: React.ReactNode;
  columns: { key: string; label: string; render?: (val: unknown, row: Record<string, unknown>) => React.ReactNode }[];
  query: () => PromiseLike<{ data: unknown[] | null }>;
}

const STATUS_CHIP = (val: unknown, colorMap: Record<string, string>) => {
  const s = String(val);
  return <Chip label={s.toUpperCase()} size="small" sx={{ bgcolor: `${colorMap[s] ?? '#616161'}22`, color: colorMap[s] ?? '#9e9e9e', fontWeight: 700, fontSize: '0.6rem' }} />;
};

export default function DatabaseViewer() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const tables: TableConfig[] = [
    {
      name: 'user_profiles', label: 'Users', icon: <PeopleIcon />,
      columns: [
        { key: 'id', label: 'ID', render: (v) => <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{String(v).slice(0, 8)}...</Typography> },
        { key: 'full_name', label: 'Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'role', label: 'Role', render: (v) => STATUS_CHIP(v, { admin: '#ab47bc', user: '#42a5f5', operator: '#ffa726' }) },
        { key: 'created_at', label: 'Joined', render: (v) => <Typography variant="caption">{format(new Date(String(v)), 'dd/MM/yy')}</Typography> },
      ],
      query: () => supabase.from('user_profiles').select('*').order('created_at', { ascending: false }) as PromiseLike<{ data: unknown[] | null }>,
    },
    {
      name: 'vehicles', label: 'Vehicles', icon: <DirectionsCarIcon />,
      columns: [
        { key: 'vehicle_number', label: 'Number', render: (v) => <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'primary.light' }}>{String(v)}</Typography> },
        { key: 'vehicle_type', label: 'Type', render: (v) => STATUS_CHIP(v, { car: '#42a5f5', bike: '#26c6da', suv: '#ab47bc', truck: '#ffa726' }) },
        { key: 'brand', label: 'Brand' },
        { key: 'model', label: 'Model' },
        { key: 'color', label: 'Color' },
        { key: 'created_at', label: 'Added', render: (v) => <Typography variant="caption">{format(new Date(String(v)), 'dd/MM/yy')}</Typography> },
      ],
      query: () => supabase.from('vehicles').select('*').order('created_at', { ascending: false }) as PromiseLike<{ data: unknown[] | null }>,
    },
    {
      name: 'parking_slots', label: 'Parking Slots', icon: <LocalParkingIcon />,
      columns: [
        { key: 'slot_number', label: 'Slot', render: (v) => <Typography variant="body2" sx={{ fontWeight: 700 }}>{String(v)}</Typography> },
        { key: 'slot_type', label: 'Type', render: (v) => STATUS_CHIP(v, { regular: '#42a5f5', vip: '#ffd700', ev: '#66bb6a', handicapped: '#ab47bc' }) },
        { key: 'status', label: 'Status', render: (v) => STATUS_CHIP(v, { available: '#4caf50', occupied: '#f44336', reserved: '#ff9800', not_available: '#616161' }) },
        { key: 'floor_id', label: 'Floor ID', render: (v) => <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{String(v).slice(0, 8)}...</Typography> },
      ],
      query: () => supabase.from('parking_slots').select('*').order('slot_number') as PromiseLike<{ data: unknown[] | null }>,
    },
    {
      name: 'bookings', label: 'Bookings', icon: <BookOnlineIcon />,
      columns: [
        { key: 'vehicle_number', label: 'Vehicle', render: (v) => <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{String(v)}</Typography> },
        { key: 'status', label: 'Status', render: (v) => STATUS_CHIP(v, { reserved: '#ff9800', active: '#4caf50', completed: '#42a5f5', cancelled: '#f44336' }) },
        { key: 'booked_duration_hours', label: 'Duration', render: (v) => `${String(v)}h` },
        { key: 'base_rate', label: 'Rate', render: (v) => `₹${String(v)}/hr` },
        { key: 'entry_time', label: 'Entry', render: (v) => v ? <Typography variant="caption">{format(new Date(String(v)), 'dd/MM hh:mm a')}</Typography> : <Typography variant="caption" sx={{ color: 'text.secondary' }}>—</Typography> },
        { key: 'created_at', label: 'Created', render: (v) => <Typography variant="caption">{format(new Date(String(v)), 'dd/MM hh:mm a')}</Typography> },
      ],
      query: () => supabase.from('bookings').select('*').order('created_at', { ascending: false }) as PromiseLike<{ data: unknown[] | null }>,
    },
    {
      name: 'payments', label: 'Payments', icon: <PaymentIcon />,
      columns: [
        { key: 'transaction_id', label: 'Txn ID', render: (v) => <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'primary.light' }}>{String(v) || '—'}</Typography> },
        { key: 'total_amount', label: 'Total', render: (v) => <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>₹{String(v)}</Typography> },
        { key: 'base_amount', label: 'Base', render: (v) => `₹${String(v)}` },
        { key: 'extra_time_amount', label: 'Extra', render: (v) => `₹${String(v)}` },
        { key: 'penalty_amount', label: 'Penalty', render: (v) => <Typography variant="body2" sx={{ color: Number(v) > 0 ? 'error.main' : 'text.secondary' }}>₹{String(v)}</Typography> },
        { key: 'payment_status', label: 'Status', render: (v) => STATUS_CHIP(v, { pending: '#ff9800', completed: '#4caf50', failed: '#f44336', refunded: '#ab47bc' }) },
        { key: 'payment_method', label: 'Method', render: (v) => STATUS_CHIP(v, { upi: '#66bb6a', card: '#42a5f5', cash: '#ffa726', online: '#ab47bc' }) },
        { key: 'created_at', label: 'Date', render: (v) => <Typography variant="caption">{format(new Date(String(v)), 'dd/MM/yy')}</Typography> },
      ],
      query: () => supabase.from('payments').select('*').order('created_at', { ascending: false }) as PromiseLike<{ data: unknown[] | null }>,
    },
    {
      name: 'notifications', label: 'Notifications', icon: <NotificationsIcon />,
      columns: [
        { key: 'title', label: 'Title', render: (v) => <Typography variant="body2" sx={{ fontWeight: 600 }}>{String(v)}</Typography> },
        { key: 'type', label: 'Type', render: (v) => STATUS_CHIP(v, { info: '#42a5f5', warning: '#ffa726', penalty: '#f44336', success: '#4caf50', alert: '#ff7043' }) },
        { key: 'is_read', label: 'Read', render: (v) => <Chip label={v ? 'Read' : 'Unread'} size="small" sx={{ bgcolor: v ? 'rgba(66,165,245,0.1)' : 'rgba(255,167,38,0.1)', color: v ? '#42a5f5' : '#ffa726', fontSize: '0.6rem' }} /> },
        { key: 'message', label: 'Message', render: (v) => <Typography variant="caption" sx={{ color: 'text.secondary', maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(v)}</Typography> },
        { key: 'created_at', label: 'Time', render: (v) => <Typography variant="caption">{format(new Date(String(v)), 'dd/MM hh:mm a')}</Typography> },
      ],
      query: () => supabase.from('notifications').select('*').order('created_at', { ascending: false }) as PromiseLike<{ data: unknown[] | null }>,
    },
    {
      name: 'penalties', label: 'Penalties', icon: <WarningAmberIcon />,
      columns: [
        { key: 'booking_id', label: 'Booking', render: (v) => <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{String(v).slice(0, 8)}...</Typography> },
        { key: 'overstay_minutes', label: 'Overstay', render: (v) => <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 600 }}>{String(v)} min</Typography> },
        { key: 'penalty_amount', label: 'Amount', render: (v) => <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>₹{String(v)}</Typography> },
        { key: 'reason', label: 'Reason' },
        { key: 'is_paid', label: 'Paid', render: (v) => <Chip label={v ? 'Paid' : 'Unpaid'} size="small" sx={{ bgcolor: v ? 'rgba(76,175,80,0.2)' : 'rgba(239,83,80,0.2)', color: v ? '#4caf50' : '#ef5350', fontSize: '0.6rem' }} /> },
        { key: 'created_at', label: 'Date', render: (v) => <Typography variant="caption">{format(new Date(String(v)), 'dd/MM hh:mm a')}</Typography> },
      ],
      query: () => supabase.from('penalties').select('*').order('created_at', { ascending: false }) as PromiseLike<{ data: unknown[] | null }>,
    },
  ];

  const currentTable = tables[activeTab];

  const fetchData = async () => {
    setLoading(true);
    const { data: rows } = await currentTable.query();
    setData((rows as Record<string, unknown>[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const filtered = data.filter(row =>
    Object.values(row).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
  );

  const sorted = [...filtered].sort((a, b) => {
    const av = String(a[sortKey] ?? '');
    const bv = String(b[sortKey] ?? '');
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  if (!isAdmin) {
    return <Box sx={{ p: 3 }}><Alert severity="error">Access denied. Admin privileges required.</Alert></Box>;
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
            <StorageIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.light' }} />
            Database Viewer
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Live view of all database tables with search and sort
          </Typography>
        </Box>
        <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={fetchData} disabled={loading}>
          Refresh
        </Button>
      </Box>

      {/* Table Selector */}
      <Card sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => { setActiveTab(v); setSearch(''); }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { fontWeight: 600, minHeight: 52, fontSize: '0.75rem' },
            '& .Mui-selected': { color: 'primary.light' },
            '& .MuiTabs-indicator': { bgcolor: 'primary.light', height: 3 },
          }}
        >
          {tables.map((t) => (
            <Tab key={t.name} label={t.label} icon={<Box sx={{ '& svg': { fontSize: 18 } }}>{t.icon}</Box>} iconPosition="start" />
          ))}
        </Tabs>
      </Card>

      {/* Search + Count */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <TextField
          label="Search" value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${currentTable.label}...`}
          size="small" sx={{ flex: 1 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment> }}
        />
        <Chip label={`${sorted.length} record${sorted.length !== 1 ? 's' : ''}`} size="small" sx={{ bgcolor: 'rgba(21,101,192,0.2)', color: 'primary.light' }} />
      </Box>

      {/* Data Table */}
      <TableContainer component={Paper} sx={{ maxHeight: 600, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {currentTable.columns.map(col => (
                <TableCell key={col.key} sx={{ bgcolor: 'rgba(5,13,26,0.95)', fontWeight: 700 }}>
                  <TableSortLabel
                    active={sortKey === col.key}
                    direction={sortKey === col.key ? sortDir : 'asc'}
                    onClick={() => handleSort(col.key)}
                    sx={{ color: '#90caf9 !important', '& .MuiTableSortLabel-icon': { color: '#90caf9 !important' } }}
                  >
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <TableRow key={i}>
                  {currentTable.columns.map(col => (
                    <TableCell key={col.key}><Skeleton /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={currentTable.columns.length} sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {search ? 'No records match your search' : 'No records found'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((row, i) => (
                <TableRow key={String(row.id ?? i)} hover>
                  {currentTable.columns.map(col => (
                    <TableCell key={col.key}>
                      {col.render ? col.render(row[col.key], row) : (
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {row[col.key] === null || row[col.key] === undefined ? '—' : String(row[col.key])}
                        </Typography>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
