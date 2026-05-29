import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EvStationIcon from '@mui/icons-material/EvStation';
import AccessibleIcon from '@mui/icons-material/Accessible';
import StarIcon from '@mui/icons-material/Star';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import { supabase } from '../lib/supabase';
import type { ParkingFloor, ParkingSlot } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  available: { bg: 'rgba(46,125,50,0.15)', border: '1px solid rgba(76,175,80,0.4)', text: '#4caf50', label: 'Available' },
  occupied: { bg: 'rgba(198,40,40,0.15)', border: '1px solid rgba(244,67,54,0.4)', text: '#f44336', label: 'Occupied' },
  reserved: { bg: 'rgba(230,81,0,0.15)', border: '1px solid rgba(255,152,0,0.4)', text: '#ff9800', label: 'Reserved' },
  not_available: { bg: 'rgba(66,66,66,0.15)', border: '1px solid rgba(97,97,97,0.3)', text: '#9e9e9e', label: 'N/A' },
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  vip: <StarIcon sx={{ fontSize: 12 }} />,
  ev: <EvStationIcon sx={{ fontSize: 12 }} />,
  handicapped: <AccessibleIcon sx={{ fontSize: 12 }} />,
  regular: <LocalParkingIcon sx={{ fontSize: 12 }} />,
};

const HOURLY_RATES: Record<string, number> = { B1: 40, B2: 40, GF: 50, VIP: 150 };

export default function BookingPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [floors, setFloors] = useState<ParkingFloor[]>([]);
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [selectedFloorIdx, setSelectedFloorIdx] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('car');
  const [duration, setDuration] = useState(2);

  useEffect(() => {
    const fetchData = async () => {
      const { data: floorData } = await supabase.from('parking_floors').select('*').eq('is_active', true).order('floor_code');
      setFloors(floorData ?? []);

      if (floorData?.length) {
        const initialIdx = location.state?.floorId
          ? floorData.findIndex(f => f.id === location.state.floorId)
          : 0;
        const idx = initialIdx >= 0 ? initialIdx : 0;
        setSelectedFloorIdx(idx);
        await fetchSlots(floorData[idx].id);
      }
      setLoading(false);
    };
    fetchData();
  }, [location.state]);

  const fetchSlots = async (floorId: string) => {
    const { data } = await supabase
      .from('parking_slots')
      .select('*')
      .eq('floor_id', floorId)
      .order('slot_number');
    setSlots(data ?? []);
  };

  const handleFloorChange = async (_: React.SyntheticEvent, idx: number) => {
    setSelectedFloorIdx(idx);
    setSelectedSlot(null);
    if (floors[idx]) await fetchSlots(floors[idx].id);
  };

  const handleSlotClick = (slot: ParkingSlot) => {
    if (slot.status !== 'available') return;
    setSelectedSlot(slot);
    setConfirmOpen(true);
    setError('');
  };

  const handleBook = async () => {
    if (!user || !selectedSlot) return;
    if (!vehicleNumber.trim()) { setError('Please enter vehicle number'); return; }
    const vn = vehicleNumber.trim().toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/.test(vn)) {
      setError('Invalid vehicle number format (e.g., KA01AB1234)'); return;
    }
    setBookingLoading(true);
    setError('');

    // Upsert vehicle
    await supabase.from('vehicles').upsert({
      user_id: user.id,
      vehicle_number: vn,
      vehicle_type: vehicleType,
    }, { onConflict: 'user_id,vehicle_number' });

    const { data: veh } = await supabase.from('vehicles').select('id').eq('user_id', user.id).eq('vehicle_number', vn).maybeSingle();

    const floor = floors[selectedFloorIdx];
    const rate = HOURLY_RATES[floor?.floor_code] ?? 50;
    const expectedExit = new Date(Date.now() + duration * 3600000).toISOString();

    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        slot_id: selectedSlot.id,
        vehicle_id: veh?.id ?? null,
        vehicle_number: vn,
        status: 'reserved',
        booked_duration_hours: duration,
        expected_exit_time: expectedExit,
        base_rate: rate,
      })
      .select()
      .single();

    if (bErr) { setError(bErr.message); setBookingLoading(false); return; }

    // Update slot to reserved
    await supabase.from('parking_slots').update({ status: 'reserved' }).eq('id', selectedSlot.id);

    // Add notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      booking_id: booking.id,
      title: 'Booking Confirmed',
      message: `Slot ${selectedSlot.slot_number} on ${floor?.floor_name} booked for ${duration}h. Vehicle: ${vn}`,
      type: 'success',
      is_read: false,
    });

    setBookingLoading(false);
    setConfirmOpen(false);
    setSuccess(`Booking confirmed! Slot ${selectedSlot.slot_number} reserved for ${duration} hour(s).`);
    await fetchSlots(floors[selectedFloorIdx].id);
    setTimeout(() => navigate('/history'), 2000);
  };

  const currentFloor = floors[selectedFloorIdx];
  const floorRate = HOURLY_RATES[currentFloor?.floor_code] ?? 50;
  const totalCost = floorRate * duration;

  // Group slots by row (letter prefix)
  const slotGroups: Record<string, ParkingSlot[]> = {};
  slots.forEach(s => {
    const prefix = s.slot_number.replace(/\d/g, '');
    if (!slotGroups[prefix]) slotGroups[prefix] = [];
    slotGroups[prefix].push(s);
  });

  const floorAvail = slots.filter(s => s.status === 'available').length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
        <BookOnlineIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.light' }} />
        Book Parking Slot
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Select a floor and available slot to reserve your parking space
      </Typography>

      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Floor Tabs */}
      <Card sx={{ mb: 2 }}>
        <Tabs
          value={selectedFloorIdx}
          onChange={handleFloorChange}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': { fontWeight: 600, minHeight: 56 },
            '& .Mui-selected': { color: 'primary.light' },
            '& .MuiTabs-indicator': { bgcolor: 'primary.light', height: 3 },
          }}
        >
          {floors.map((f) => (
            <Tab key={f.id} label={f.floor_name} />
          ))}
        </Tabs>
      </Card>

      {currentFloor && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {currentFloor.description}
          </Typography>
          <Chip label={`₹${floorRate}/hr`} size="small" sx={{ bgcolor: 'rgba(21,101,192,0.2)', color: 'primary.light', fontWeight: 700 }} />
          <Chip
            label={`${floorAvail} Available`}
            size="small"
            sx={{ bgcolor: 'rgba(46,125,50,0.2)', color: '#4caf50', fontWeight: 700 }}
          />
        </Box>
      )}

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_STYLES).map(([status, style]) => (
          <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 16, borderRadius: 0.5, bgcolor: style.bg, border: style.border }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{style.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Parking Grid */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2 }}>
          {/* Drive Lane indicator */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
            <Chip
              label="ENTRY / EXIT"
              size="small"
              icon={<DirectionsCarIcon />}
              sx={{ mx: 2, bgcolor: 'rgba(21,101,192,0.2)', color: 'primary.light', fontWeight: 700 }}
            />
            <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
          </Box>

          {loading ? (
            <Grid container spacing={1}>
              {[...Array(20)].map((_, i) => (
                <Grid size={{ xs: 3, sm: 2, md: 1.5 }} key={i}>
                  <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
                </Grid>
              ))}
            </Grid>
          ) : (
            Object.entries(slotGroups).map(([row, rowSlots]) => (
              <Box key={row} sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, mb: 1, display: 'block' }}>
                  Row {row}
                </Typography>
                <Grid container spacing={1}>
                  {rowSlots.map((slot) => {
                    const s = STATUS_STYLES[slot.status];
                    return (
                      <Grid size={{ xs: 3, sm: 2, md: 1 }} key={slot.id}>
                        <Tooltip
                          title={`${slot.slot_number} — ${s.label}${slot.slot_type !== 'regular' ? ` (${slot.slot_type.toUpperCase()})` : ''}`}
                          arrow
                        >
                          <Box
                            onClick={() => handleSlotClick(slot)}
                            sx={{
                              height: 52,
                              borderRadius: 1.5,
                              border: s.border,
                              bgcolor: s.bg,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: slot.status === 'available' ? 'pointer' : 'not-allowed',
                              transition: 'all 0.15s',
                              '&:hover': slot.status === 'available' ? {
                                transform: 'scale(1.05)',
                                boxShadow: `0 4px 16px ${s.text}40`,
                                border: `1px solid ${s.text}`,
                              } : {},
                            }}
                          >
                            <Box sx={{ color: s.text, display: 'flex', mb: 0.25 }}>
                              {TYPE_ICON[slot.slot_type]}
                            </Box>
                            <Typography variant="caption" sx={{ color: s.text, fontWeight: 700, fontSize: '0.6rem', lineHeight: 1 }}>
                              {slot.slot_number}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </Grid>
                    );
                  })}
                </Grid>
                <Divider sx={{ mt: 1.5, borderColor: 'rgba(100,181,246,0.06)' }} />
              </Box>
            ))
          )}
        </CardContent>
      </Card>

      {/* Booking Confirmation Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => !bookingLoading && setConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: 'background.paper', border: '1px solid rgba(100,181,246,0.15)' } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          <BookOnlineIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.light' }} />
          Confirm Booking — Slot {selectedSlot?.slot_number}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(21,101,192,0.08)', border: '1px solid rgba(21,101,192,0.15)' }}>
              <Grid container spacing={1}>
                <Grid size={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Floor</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{currentFloor?.floor_name}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Slot</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>{selectedSlot?.slot_number}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Rate</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{floorRate}/hour</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>Type</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>{selectedSlot?.slot_type}</Typography>
                </Grid>
              </Grid>
            </Box>

            <TextField
              fullWidth label="Vehicle Number" value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              placeholder="KA01AB1234" required
              helperText="Format: KA01AB1234"
              inputProps={{ style: { textTransform: 'uppercase' } }}
            />

            <FormControl fullWidth>
              <InputLabel>Vehicle Type</InputLabel>
              <Select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} label="Vehicle Type">
                <MenuItem value="car">Car</MenuItem>
                <MenuItem value="bike">Bike</MenuItem>
                <MenuItem value="suv">SUV</MenuItem>
                <MenuItem value="truck">Truck</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Parking Duration</InputLabel>
              <Select value={duration} onChange={(e) => setDuration(Number(e.target.value))} label="Parking Duration">
                {[1, 2, 3, 4, 6, 8, 12, 24].map(h => (
                  <MenuItem key={h} value={h}>{h} Hour{h > 1 ? 's' : ''}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(46,125,50,0.1)', border: '1px solid rgba(76,175,80,0.2)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Base Charge ({duration}h × ₹{floorRate})</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{totalCost}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Estimated Total</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.main' }}>₹{totalCost}</Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>* Overstay charges apply after booked duration</Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={bookingLoading} variant="outlined">Cancel</Button>
          <Button
            variant="contained" onClick={handleBook} disabled={bookingLoading}
            startIcon={bookingLoading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
          >
            {bookingLoading ? 'Booking...' : 'Confirm Booking'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
