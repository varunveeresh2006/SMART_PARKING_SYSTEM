import { useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { supabase } from '../lib/supabase';
import type { Booking } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { format, differenceInMinutes } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';

export default function EntryExitPage() {
  const { user } = useAuth();
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [foundBooking, setFoundBooking] = useState<Booking | null>(null);
  const [searchError, setSearchError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [penaltyDialog, setPenaltyDialog] = useState(false);
  const [penaltyInfo, setPenaltyInfo] = useState<{ minutes: number; amount: number } | null>(null);
  const [qrDialog, setQrDialog] = useState(false);

  const handleSearch = async () => {
    if (!vehicleSearch.trim()) { setSearchError('Enter vehicle number'); return; }
    setSearchLoading(true);
    setSearchError('');
    setFoundBooking(null);
    setSuccessMsg('');

    const vn = vehicleSearch.trim().toUpperCase();
    const { data, error } = await supabase
      .from('bookings')
      .select(`*, parking_slots(*, parking_floors(*))`)
      .eq('vehicle_number', vn)
      .in('status', ['reserved', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      setSearchError('No active booking found for this vehicle number.');
    } else {
      setFoundBooking(data);
    }
    setSearchLoading(false);
  };

  const handleEntry = async () => {
    if (!foundBooking || !user) return;
    setActionLoading(true);
    const now = new Date().toISOString();
    await supabase.from('bookings').update({ status: 'active', entry_time: now }).eq('id', foundBooking.id);
    await supabase.from('parking_slots').update({ status: 'occupied' }).eq('id', foundBooking.slot_id);

    await supabase.from('notifications').insert({
      user_id: foundBooking.user_id,
      booking_id: foundBooking.id,
      title: 'Vehicle Entry Recorded',
      message: `Your vehicle ${foundBooking.vehicle_number} has entered. Slot ${foundBooking.parking_slots?.slot_number}. Expected exit: ${format(new Date(foundBooking.expected_exit_time!), 'hh:mm a')}`,
      type: 'info',
      is_read: false,
    });

    setFoundBooking({ ...foundBooking, status: 'active', entry_time: now });
    setSuccessMsg(`Entry recorded for ${foundBooking.vehicle_number} at ${format(new Date(), 'hh:mm a')}. Welcome!`);
    setActionLoading(false);
  };

  const handleExit = async () => {
    if (!foundBooking || !user) return;
    setActionLoading(true);

    const now = new Date();
    const exitTime = now.toISOString();
    const entryTime = foundBooking.entry_time ? new Date(foundBooking.entry_time) : new Date(foundBooking.created_at);
    const totalMinutes = differenceInMinutes(now, entryTime);
    const bookedMinutes = foundBooking.booked_duration_hours * 60;
    const overstayMinutes = Math.max(0, totalMinutes - bookedMinutes);
    const rate = foundBooking.base_rate;
    const baseAmount = rate * foundBooking.booked_duration_hours;
    const extraAmount = overstayMinutes > 0 ? Math.ceil(overstayMinutes / 30) * (rate / 2) : 0;
    let penaltyAmount = 0;

    if (overstayMinutes > 30) {
      penaltyAmount = Math.ceil(overstayMinutes / 60) * 100;
      await supabase.from('penalties').insert({
        booking_id: foundBooking.id,
        user_id: foundBooking.user_id,
        overstay_minutes: overstayMinutes,
        penalty_amount: penaltyAmount,
        reason: `Overstay by ${overstayMinutes} minutes`,
        is_paid: false,
      });

      await supabase.from('notifications').insert({
        user_id: foundBooking.user_id,
        booking_id: foundBooking.id,
        title: 'Parking Overstay Penalty',
        message: `Your parking time exceeded by ${overstayMinutes} minutes. A penalty of ₹${penaltyAmount} has been added.`,
        type: 'penalty',
        is_read: false,
      });
    }

    const total = baseAmount + extraAmount + penaltyAmount;

    // Create payment record
    await supabase.from('payments').insert({
      booking_id: foundBooking.id,
      user_id: foundBooking.user_id,
      base_amount: baseAmount,
      extra_time_amount: extraAmount,
      penalty_amount: penaltyAmount,
      total_amount: total,
      payment_method: 'online',
      payment_status: 'pending',
      transaction_id: `TXN${Date.now()}`,
    });

    await supabase.from('bookings').update({ status: 'completed', exit_time: exitTime }).eq('id', foundBooking.id);
    await supabase.from('parking_slots').update({ status: 'available' }).eq('id', foundBooking.slot_id);

    await supabase.from('notifications').insert({
      user_id: foundBooking.user_id,
      booking_id: foundBooking.id,
      title: 'Vehicle Exit Recorded',
      message: `Your vehicle ${foundBooking.vehicle_number} has exited. Total duration: ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m. Amount due: ₹${total}`,
      type: 'info',
      is_read: false,
    });

    setActionLoading(false);

    if (overstayMinutes > 30) {
      setPenaltyInfo({ minutes: overstayMinutes, amount: penaltyAmount });
      setPenaltyDialog(true);
    } else {
      setSuccessMsg(`Exit recorded. Duration: ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m. Amount due: ₹${total}`);
      setFoundBooking(null);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
        <DirectionsCarIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.light' }} />
        Vehicle Entry / Exit
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Search by vehicle number to record entry or exit
      </Typography>

      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
                <SearchIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                Search Vehicle
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  label="Vehicle Number"
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value.toUpperCase())}
                  placeholder="KA01AB1234"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                />
                <Button
                  variant="contained" onClick={handleSearch}
                  disabled={searchLoading} sx={{ minWidth: 100 }}
                >
                  {searchLoading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                </Button>
              </Box>

              {searchError && <Alert severity="warning">{searchError}</Alert>}

              {foundBooking && (
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(21,101,192,0.1)', border: '1px solid rgba(21,101,192,0.2)', mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        Booking Found
                      </Typography>
                      <Chip
                        label={foundBooking.status.toUpperCase()}
                        size="small"
                        sx={{
                          bgcolor: foundBooking.status === 'active' ? 'rgba(46,125,50,0.2)' : 'rgba(230,81,0,0.2)',
                          color: foundBooking.status === 'active' ? '#4caf50' : '#ff9800',
                          fontWeight: 700,
                        }}
                      />
                    </Box>

                    <Grid container spacing={1}>
                      {[
                        { label: 'Vehicle', val: foundBooking.vehicle_number },
                        { label: 'Slot', val: foundBooking.parking_slots?.slot_number ?? '—' },
                        { label: 'Floor', val: (foundBooking.parking_slots as { parking_floors?: { floor_name?: string } })?.parking_floors?.floor_name ?? '—' },
                        { label: 'Booked For', val: `${foundBooking.booked_duration_hours}h` },
                        { label: 'Booking Time', val: format(new Date(foundBooking.created_at), 'dd/MM/yy hh:mm a') },
                        {
                          label: 'Expected Exit',
                          val: foundBooking.expected_exit_time
                            ? format(new Date(foundBooking.expected_exit_time), 'hh:mm a')
                            : '—'
                        },
                      ].map(item => (
                        <Grid size={6} key={item.label}>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{item.label}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.val}</Typography>
                        </Grid>
                      ))}
                    </Grid>

                    {foundBooking.entry_time && (
                      <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid rgba(100,181,246,0.1)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTimeIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                          <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600 }}>
                            Entry: {format(new Date(foundBooking.entry_time), 'hh:mm a')} —
                            {' '}{differenceInMinutes(new Date(), new Date(foundBooking.entry_time))} min elapsed
                          </Typography>
                        </Box>
                        {foundBooking.expected_exit_time && new Date() > new Date(foundBooking.expected_exit_time) && (
                          <Alert severity="warning" sx={{ mt: 1, py: 0.5 }} icon={<WarningAmberIcon />}>
                            Overstay! Penalty charges apply.
                          </Alert>
                        )}
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {foundBooking.status === 'reserved' && (
                      <Button
                        variant="contained" color="success" fullWidth
                        startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <LoginIcon />}
                        onClick={handleEntry} disabled={actionLoading}
                      >
                        Record Entry
                      </Button>
                    )}
                    {foundBooking.status === 'active' && (
                      <Button
                        variant="contained" color="error" fullWidth
                        startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <LogoutIcon />}
                        onClick={handleExit} disabled={actionLoading}
                      >
                        Record Exit
                      </Button>
                    )}
                    <Button
                      variant="outlined" onClick={() => setQrDialog(true)}
                      sx={{ minWidth: 48 }}
                    >
                      <QrCode2Icon />
                    </Button>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                <LocalParkingIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20, color: 'primary.light' }} />
                Entry/Exit Guide
              </Typography>

              {[
                { step: 1, title: 'Search Vehicle', desc: 'Enter your vehicle registration number to find your active booking', icon: <SearchIcon sx={{ color: 'primary.light' }} /> },
                { step: 2, title: 'Record Entry', desc: 'Click "Record Entry" when your vehicle enters the parking lot', icon: <LoginIcon sx={{ color: 'success.main' }} /> },
                { step: 3, title: 'Record Exit', desc: 'Click "Record Exit" when leaving. Payment will be calculated automatically', icon: <LogoutIcon sx={{ color: 'error.main' }} /> },
                { step: 4, title: 'Pay at Kiosk', desc: 'Complete payment at the exit kiosk or via online payment', icon: <CheckCircleIcon sx={{ color: 'warning.main' }} /> },
              ].map((s, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2, mb: i < 3 ? 2 : 0 }}>
                  <Box sx={{
                    width: 40, height: 40, borderRadius: 2, flexShrink: 0,
                    bgcolor: 'rgba(21,101,192,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {s.icon}
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      Step {s.step}: {s.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{s.desc}</Typography>
                  </Box>
                </Box>
              ))}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(230,81,0,0.08)', border: '1px solid rgba(255,152,0,0.2)' }}>
                <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600, display: 'block', mb: 0.5 }}>
                  <WarningAmberIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                  Penalty Policy
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Overstay by 30+ minutes: ₹100/hour extra charge.
                  Notification sent automatically.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* QR Dialog */}
      <Dialog open={qrDialog} onClose={() => setQrDialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 700 }}>Parking QR Code</DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 3 }}>
          {foundBooking && (
            <>
              <Box sx={{ p: 2, bgcolor: 'white', display: 'inline-block', borderRadius: 2, mb: 2 }}>
                <QRCodeSVG
                  value={JSON.stringify({ bookingId: foundBooking.id, vehicle: foundBooking.vehicle_number, slot: foundBooking.parking_slots?.slot_number })}
                  size={180}
                />
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Scan at entry/exit gate
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 1 }}>
                {foundBooking.vehicle_number}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Slot: {foundBooking.parking_slots?.slot_number}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button onClick={() => setQrDialog(false)} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Penalty Dialog */}
      <Dialog open={penaltyDialog} onClose={() => { setPenaltyDialog(false); setFoundBooking(null); }} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper' } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'warning.main' }}>
          <WarningAmberIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Overstay Penalty Applied
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Your parking time has exceeded by {penaltyInfo?.minutes} minutes.
          </Alert>
          <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(230,81,0,0.1)', border: '1px solid rgba(255,152,0,0.2)' }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Overstay Duration: <strong>{penaltyInfo?.minutes} minutes</strong></Typography>
            <Typography variant="body2">Penalty Amount: <strong style={{ color: '#ff9800' }}>₹{penaltyInfo?.amount}</strong></Typography>
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
            This penalty has been added to your payment. A notification has been sent to your account.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => { setPenaltyDialog(false); setFoundBooking(null); setSuccessMsg('Exit recorded. Penalty applied. Please proceed to payment.'); }}>
            Acknowledge & Pay
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
