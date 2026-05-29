import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Grid from '@mui/material/Grid';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import HistoryIcon from '@mui/icons-material/History';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CancelIcon from '@mui/icons-material/Cancel';
import SearchIcon from '@mui/icons-material/Search';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import InfoIcon from '@mui/icons-material/Info';
import CircularProgress from '@mui/material/CircularProgress';
import { supabase } from '../lib/supabase';
import type { Booking } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { format, differenceInMinutes } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  reserved: { label: 'Reserved', color: '#ff9800', bg: 'rgba(230,81,0,0.2)' },
  active: { label: 'Active', color: '#4caf50', bg: 'rgba(46,125,50,0.2)' },
  completed: { label: 'Completed', color: '#90caf9', bg: 'rgba(21,101,192,0.2)' },
  cancelled: { label: 'Cancelled', color: '#ef5350', bg: 'rgba(198,40,40,0.2)' },
};

export default function BookingHistoryPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [qrBooking, setQrBooking] = useState<Booking | null>(null);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchBookings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('bookings')
      .select(`*, parking_slots(*, parking_floors(*))`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setBookings(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, [user]);

  const handleCancel = async (booking: Booking) => {
    setCancelling(booking.id);
    setError('');
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);
    await supabase.from('parking_slots').update({ status: 'available' }).eq('id', booking.slot_id);
    await supabase.from('notifications').insert({
      user_id: user!.id,
      booking_id: booking.id,
      title: 'Booking Cancelled',
      message: `Your booking for slot ${booking.parking_slots?.slot_number} has been cancelled.`,
      type: 'info',
      is_read: false,
    });
    await fetchBookings();
    setSuccess('Booking cancelled successfully.');
    setCancelling(null);
  };

  const filtered = bookings.filter(b =>
    b.vehicle_number.includes(search.toUpperCase()) ||
    b.parking_slots?.slot_number?.includes(search.toUpperCase()) ||
    b.status.includes(search.toLowerCase())
  );

  const statusCounts = {
    total: bookings.length,
    active: bookings.filter(b => b.status === 'active').length,
    reserved: bookings.filter(b => b.status === 'reserved').length,
    completed: bookings.filter(b => b.status === 'completed').length,
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
        <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.light' }} />
        Booking History
      </Typography>

      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total', val: statusCounts.total, color: 'primary.light' },
          { label: 'Active', val: statusCounts.active, color: 'success.main' },
          { label: 'Reserved', val: statusCounts.reserved, color: 'warning.main' },
          { label: 'Completed', val: statusCounts.completed, color: 'text.secondary' },
        ].map(s => (
          <Grid size={{ xs: 6, sm: 3 }} key={s.label}>
            <Card>
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                  {s.label}
                </Typography>
                {loading ? <Skeleton height={40} /> : (
                  <Typography variant="h4" sx={{ fontWeight: 700, color: s.color }}>{s.val}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Search */}
      <TextField
        fullWidth label="Search bookings" value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Vehicle number, slot, status..."
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment>,
        }}
      />

      {/* Booking list */}
      {loading ? (
        [...Array(4)].map((_, i) => <Skeleton key={i} variant="rectangular" height={120} sx={{ mb: 2, borderRadius: 2 }} />)
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 5 }}>
            <HistoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.3 }} />
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              {search ? 'No bookings match your search' : 'No bookings yet. Book your first parking slot!'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        filtered.map((booking) => {
          const sc = STATUS_CONFIG[booking.status];
          const floor = (booking.parking_slots as { parking_floors?: { floor_name?: string } })?.parking_floors;
          const duration = booking.entry_time && booking.exit_time
            ? differenceInMinutes(new Date(booking.exit_time), new Date(booking.entry_time))
            : null;

          return (
            <Card key={booking.id} sx={{ mb: 2 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <Box sx={{
                      width: 44, height: 44, borderRadius: 2, flexShrink: 0,
                      bgcolor: 'rgba(21,101,192,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <DirectionsCarIcon sx={{ color: 'primary.light' }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {booking.vehicle_number}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocationOnIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {floor?.floor_name} — Slot {booking.parking_slots?.slot_number}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Chip label={sc.label} size="small" sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700 }} />
                </Box>

                <Grid container spacing={1} sx={{ mb: 1.5 }}>
                  <Grid size={6}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Booked On</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                      {format(new Date(booking.created_at), 'dd/MM/yy hh:mm a')}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Duration</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                      {duration !== null ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${booking.booked_duration_hours}h (booked)`}
                    </Typography>
                  </Grid>
                  {booking.entry_time && (
                    <Grid size={6}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>Entry</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                        <AccessTimeIcon sx={{ fontSize: 12, mr: 0.3, verticalAlign: 'middle', color: 'success.main' }} />
                        {format(new Date(booking.entry_time), 'hh:mm a')}
                      </Typography>
                    </Grid>
                  )}
                  {booking.exit_time && (
                    <Grid size={6}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>Exit</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                        <AccessTimeIcon sx={{ fontSize: 12, mr: 0.3, verticalAlign: 'middle', color: 'error.main' }} />
                        {format(new Date(booking.exit_time), 'hh:mm a')}
                      </Typography>
                    </Grid>
                  )}
                </Grid>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  {(booking.status === 'reserved' || booking.status === 'active') && (
                    <>
                      <Button
                        size="small" variant="outlined"
                        startIcon={<QrCode2Icon />}
                        onClick={() => setQrBooking(booking)}
                        sx={{ borderColor: 'rgba(100,181,246,0.3)' }}
                      >
                        QR
                      </Button>
                      {booking.status === 'reserved' && (
                        <Button
                          size="small" variant="outlined" color="error"
                          startIcon={cancelling === booking.id ? <CircularProgress size={14} color="inherit" /> : <CancelIcon />}
                          onClick={() => handleCancel(booking)}
                          disabled={!!cancelling}
                        >
                          Cancel
                        </Button>
                      )}
                    </>
                  )}
                  <Button
                    size="small" variant="text"
                    startIcon={<InfoIcon />}
                    onClick={() => setDetailBooking(booking)}
                    sx={{ color: 'text.secondary' }}
                  >
                    Details
                  </Button>
                </Box>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* QR Dialog */}
      <Dialog open={!!qrBooking} onClose={() => setQrBooking(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 700 }}>
          <QrCode2Icon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.light' }} />
          Parking Pass QR
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 2 }}>
          {qrBooking && (
            <>
              <Box sx={{ p: 2, bgcolor: 'white', display: 'inline-block', borderRadius: 2, mb: 2 }}>
                <QRCodeSVG
                  value={JSON.stringify({ id: qrBooking.id, vehicle: qrBooking.vehicle_number, slot: qrBooking.parking_slots?.slot_number })}
                  size={180}
                />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{qrBooking.vehicle_number}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {(qrBooking.parking_slots as { parking_floors?: { floor_name?: string } })?.parking_floors?.floor_name} — Slot {qrBooking.parking_slots?.slot_number}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Booked: {format(new Date(qrBooking.created_at), 'dd/MM/yy hh:mm a')}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button onClick={() => setQrBooking(null)} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailBooking} onClose={() => setDetailBooking(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Booking Details</DialogTitle>
        <DialogContent>
          {detailBooking && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {[
                { label: 'Booking ID', val: detailBooking.id.slice(0, 8) + '...' },
                { label: 'Vehicle', val: detailBooking.vehicle_number },
                { label: 'Slot', val: detailBooking.parking_slots?.slot_number ?? '—' },
                { label: 'Floor', val: (detailBooking.parking_slots as { parking_floors?: { floor_name?: string } })?.parking_floors?.floor_name ?? '—' },
                { label: 'Status', val: detailBooking.status.toUpperCase() },
                { label: 'Booked Duration', val: `${detailBooking.booked_duration_hours} hours` },
                { label: 'Rate', val: `₹${detailBooking.base_rate}/hour` },
                { label: 'Created At', val: format(new Date(detailBooking.created_at), 'dd/MM/yyyy hh:mm a') },
                ...(detailBooking.entry_time ? [{ label: 'Entry Time', val: format(new Date(detailBooking.entry_time), 'hh:mm a') }] : []),
                ...(detailBooking.exit_time ? [{ label: 'Exit Time', val: format(new Date(detailBooking.exit_time), 'hh:mm a') }] : []),
              ].map(item => (
                <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{item.label}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.val}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailBooking(null)} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
